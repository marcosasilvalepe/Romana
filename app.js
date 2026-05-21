const express = require('express');
const https = require('https');
const fs = require('fs');
const morgan = require('morgan');

const path = require('path');
const axios = require('axios');
const app = express();

const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' })

const conn = require('./config/db');
const uuid = require('uuid');

//const { connectToWebHostingSocket } = require('./hosting_frontend/socket');
//connectToWebHostingSocket();

const engine = require('express-handlebars').engine;

if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

const { SerialPort } = require('serialport');

//app.use(express.urlencoded({ extended: false }));

app.use(express.json());

// Handlebars
app.engine('.hbs', engine({ defaultLayout: 'main', extname: '.hbs' }));
app.set('view engine', '.hbs');

// STATIC FOLDER
app.use(express.static(path.join(__dirname, 'public')));

// ROUTES -> NEEDS TO BE AFTER MORGAN
const { router, error_handler, format_date, delay, get_current_season } = require('./routes/endpoints');
app.use('/', router);

const { documents_router } = require('./routes/documents_endpoints');
app.use('/', documents_router);

const { home_router } = require('./routes/home_endpoints');
app.use('/', home_router);

const { entities_router } = require('./routes/entities_endpoints');
app.use('/', entities_router);

const { vehicles_router } = require('./routes/vehicles_endpoints');
app.use('/', vehicles_router);

const { products_router } = require('./routes/products_endpoints');
app.use('/', products_router);

const PORT = process.env.PORT || 3443;

const { generate_electronic_document } = require('./puppeteer_script');

const { get_bank_balance } = require('./bank_balance/bank_balance');

/******************* PRODUCTION AND DEVELOPMENT SERVER *****************/

/*
let server, socket_server, io;
if (process.env.NODE_ENV === 'production') {

    const key = fs.readFileSync(path.join(__dirname, 'cert', 'romana_cert.key'));
    const cert = fs.readFileSync(path.join(__dirname, 'cert', 'romana_cert.crt'));

    server = https.createServer({
        key: key, 
        cert: cert,
        requestCert: false,
        rejectUnauthorized: false
    }, app);

    socket_server = https.createServer({
        key: key, 
        cert: cert,
        requestCert: false,
        rejectUnauthorized: false
    }, app);
    
    io = require('socket.io')(socket_server, {
        cors: { origin: '*' },
        secure: true
    });

} else {

    server = app;
    socket_server = require('http').createServer(app);
    io = require('socket.io')(socket_server, {
        cors: { origin: '*' }
    });

}
*/

const cert_path = (process.env.NODE_ENV === 'production') ? 'cert' : 'cert';
const key = fs.readFileSync(path.join(__dirname, cert_path, 'romana_cert.key'));
const cert = fs.readFileSync(path.join(__dirname, cert_path, 'romana_cert.crt'));

const server = https.createServer({
    key: key, 
    cert: cert,
    requestCert: false,
    rejectUnauthorized: false
}, app);

const socket_server = https.createServer({
    key: key, 
    cert: cert,
    requestCert: false,
    rejectUnauthorized: false
}, app);

const io = require('socket.io')(socket_server, {
    cors: { origin: '*' },
    secure: true
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode in port ${PORT} - MYSQL Status is: ${conn.state}`);
});

let weight_interval, weight_value = 0, serial_value, serial_opened = false, transmitting_data = false;

const serial = {
    port: new SerialPort({
        path: "/dev/ttyUSB0",
        baudRate: 9600,
        dataBits: 7,
        parity: 'none',
        topBits: 1,
        flowControl: false,
        autoOpen: false
    }).setEncoding('utf8'),
    opening_date: new Date(),
    sockets: []
};

//CLOSES SERIAL PORT 3 MINUTES AFTER IT WAS OPENED -> CHECKS EVERY MINUTE
setInterval(() => {
    try {

        // REMOVE SOCKETS THAT AREN'T CONNECTED FROM serial.sockets ARRAY
        for (let i = 0; i < serial.sockets.length; i++) {
            for (const s of io.sockets.sockets) {

                // MATCH THE SOCKET ID TO THE ONE IN serial.sockets
                if (s[0] !== serial.sockets[i].id) continue;

                // IF IT'S CONNECTED THEN DO NOTHING
                if (s[1].connected) continue;

                // SOCKET IS NOT CONNECTED BUT FOR SOME REASON IS INSIDE THE ARRAY SO IT GETS REMOVED
                serial.sockets.splice(i, 1);
            }
        }

        // SERIAL PORT IS CLOSED SO ALL USERS NEED TO GET REMOVED FROM THE ARRAY
        if (!serial.port.isOpen) return;


        // AFTER 3 MINTUES THE SOCKET NEEDS TO GET REMOVED
        const now = Math.round(new Date());


        // CLOSES SERIAL AFTER 10 MINUTES IF ITS OPENED
        if (now - serial.opening_date > (60000 * 10)) {
            serial.port.close();
            console.log('Serial port closed automatically after 10 minutes.');
        }
    }
    catch(e) { console.log(`Error in interval function. ${e}`) }
}, 60000);

async function save_data_to_online_db(weight_data) {
    try {

        if (process.env.NODE_ENV !== 'production') return;

        const response = await axios.post('https://lepefer.cl/romana/upload_romana_weight_data.php', weight_data);
        
        if (response.data.error !== undefined) throw response.error;
        if (!response.data.success) throw 'Success response from server is false.';

    } catch(e) { console.log(e) }
}

async function update_kilos_web_hosting(data) {

    if (process.env.NODE_ENV !== 'production') return;
        
    /****** GET VARIETIES OF EACH DOCUMENT IN WEIGHT AND UPLOAD THE TOTAL AMOUNT OF EACH OF THEM *****/
    try {

        function get_varieties() {
            return new Promise((resolve, reject) => {
                try {
                    conn.query(`
                        SELECT body.product_code AS code, products.name, products.type, products.pasas, products.image
                        FROM documents_body body
                        INNER JOIN documents_header header ON body.document_id=header.id
                        INNER JOIN weights ON header.weight_id=weights.id
                        INNER JOIN products ON body.product_code=products.code
                        WHERE body.status='T' AND header.status='I' AND header.weight_id=${parseInt(data.weight_id)}
                        GROUP BY body.product_code
                        ORDER BY body.product_code ASC;
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve(results);
                    })
                }
                catch(e) { return reject(e) }
            })
        }

        function get_product_kilos(cut, product_code) {
            return new Promise((resolve, reject) => {
                try {
                    conn.query(`
                        SELECT SUM(body.kilos) AS kilos
                        FROM documents_body body
                        INNER JOIN documents_header header ON body.document_id=header.id
                        INNER JOIN weights ON header.weight_id=weights.id
                        WHERE body.status <> 'N' AND header.status='I' AND (weights.status='T' OR weights.status='I')
                        AND weights.cycle=1 AND (weights.created BETWEEN '${season.start}' AND '${season.end}')
                        AND (header.created BETWEEN '${season.start}' AND '${season.end}')
                        AND (header.date BETWEEN '${season.start}' AND '${season.end}') 
                        AND weights.cycle=1 AND body.cut='${cut}'
                        AND body.kilos IS NOT NULL AND body.kilos > 0 AND body.product_code='${product_code}';
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve(1 * results[0].kilos);
                    })
                }
                catch(e) { return reject(e) }
            })
        }

        const season = await get_current_season();
        const products = await get_varieties();

        let total = 0;
        for (const product of products) {
            product.packing = await get_product_kilos('Packing', product.code);
            product.parron = await get_product_kilos('Parron', product.code);
            total += product.packing;
            total += product.parron;
        }

        if (total === 0) return;

        //SEND DATA TO WEBSERVER -> ADDED RETURN BECAUSE GONNA TRY TO CONNECT DIRECTLY TO SOCKET SERVER

        return;
        const response = await axios.post('https://lepefer.cl/romana/product_kilos_update.php', products);
        
        if (response.data.error !== undefined) throw response.error;
        if (!response.data.success) throw 'Success response from server is false.';

    } catch(e) { console.log(e) }
}

const save_weight_data = (weight_data, env_process) => {
    return new Promise(async (resolve, reject) => {

        const
        weight_id = weight_data.id,
        user = weight_data.user,
        process = weight_data.process,
        tara_type = weight_data.tara_type.substring(0, 1).toUpperCase(),
        input_weight = weight_data.input_weight,
        now = format_date(new Date()),
        response = { success: false };
    
        try {
    
            const get_weight_data = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT gross_status, gross_containers, gross_net, tare_status, tare_containers, tare_net 
                        FROM weights WHERE id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error || results.length === 0) return reject(error);
                        response.weight = {
                            gross: {
                                status: results[0].gross_status,
                                containers: results[0].gross_containers,
                                net: results[0].gross_net
                            },
                            tare: {
                                status: results[0].tare_status,
                                containers: results[0].tare_containers,
                                net: results[0].tare_net
                            }
                        };
    
                        response.opposite_process_status = (process === 'gross') ? response.weight.tare.status : response.weight.gross.status;
                        return resolve();
                    })
                })
            }
    
            const update_weight = () => {
                return new Promise((resolve, reject) => {
    
                    const brute_weight = (tara_type === 'A') ? weight_data.weight_value : input_weight;
    
                    let target_net, final_net_weight = null;
                    if (process === 'gross') {
                        target_net = brute_weight - response.weight.gross.containers;
                        if (response.opposite_process_status > 1) final_net_weight = target_net - response.weight.tare.net;
                    }
                    else if (process === 'tare') {
                        target_net = brute_weight - response.weight.tare.containers;
                        if (response.opposite_process_status > 1) final_net_weight = response.weight.gross.net - target_net;
                    }
                    
                    conn.query(`
                        UPDATE weights 
                        SET 
                            ${process}_status=2, 
                            ${process}_date=${conn.escape(now)}, 
                            ${process}_type=${conn.escape(tara_type)}, 
                            ${process}_user=${parseInt(user)}, 
                            ${process}_brute=${parseInt(brute_weight)}, 
                            ${process}_net=${target_net}, 
                            final_net_weight=${final_net_weight} 
                        WHERE id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve();
                    })
                })
            }
     
            const check_if_manual_weight_row_exists = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT process FROM weights_manual_input WHERE process=${conn.escape(process)} AND weight_id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        if (results.length > 0) return resolve(true);
                        return resolve(false);
                    })
                })
            }
    
            const update_manual_tara_weight = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        UPDATE weights_manual_input 
                        SET manual_brute=${parseInt(weight_data.weight_value)} 
                        WHERE process=${conn.escape(process)} AND weight_id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve();
                    })
                })
            }
    
            const insert_manual_tara_weight = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        INSERT INTO weights_manual_input (weight_id, process, manual_brute) 
                        VALUES (${parseInt(weight_id)}, '${process}', ${parseInt(weight_data.weight_value)});
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve();
                    })
                })
            }
    
            const check_update = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT weights.${process}_status AS status, weights.${process}_date, weights.${process}_type AS tara_type, 
                        weights.${process}_user AS user_id, users.name AS user_name, weights.${process}_brute AS brute, 
                        weights.${process}_net AS net, weights.final_net_weight 
                        FROM weights
                        INNER JOIN users ON weights.${process}_user=users.id
                        WHERE weights.id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error || results.length === 0) return reject(error);
                        response.update = {
                            date: new Date(now).toLocaleString('es-CL'),
                            process: process,
                            status: results[0].status,
                            tara_type: results[0].tara_type,
                            user: {
                                id: results[0].user_id,
                                name: results[0].user_name
                            },
                            brute: results[0].brute,
                            net: results[0].net,
                            final_net_weight: results[0].final_net_weight
                        };
                        return resolve();
                    })
                })
            }

            if ((weight_data.weight_value === 0 || weight_data.weight_value === NaN) && process === 'gross' && tara_type === 'A') throw 'Weight value is 0 for gross process.';
            
            await get_weight_data();
            await update_weight();

            if (tara_type === 'M') {
                const check_if_row_exists = await check_if_manual_weight_row_exists();
                if (check_if_row_exists) await update_manual_tara_weight();
                else await insert_manual_tara_weight();
            }

            await check_update();

            response.success = true;

            //SAVE TO DATA TO TEXT FILE

            //SAVE DATA TO ONLINE DB
            weight_data.now = now;
            
            if (env_process === 'production') {

                try { save_data_to_online_db(weight_data) }
                catch(err) { console.log(err) }
            }

            return resolve(response);
        }
        catch(e) { console.log(`Error updating brute weight in database. ${e}`); return reject(e) }
    })
}

const process_serial_data = data => {

    const buffer = Buffer.from(data).toString().trim();
    const weight = parseInt(buffer.substring(3, 10));
    //console.log(data);

    return { weight: parseInt(weight), serial_value: buffer };
}

const get_created_weight = weight_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.id, weights.created, weights.cycle, weights.primary_plates, weights.gross_brute, drivers.name AS driver
            FROM weights
            INNER JOIN cycles ON weights.cycle=cycles.id
            LEFT OUTER JOIN drivers ON weights.driver_id=drivers.id
            WHERE weights.id=${weight_id};
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);
            return resolve(results[0]);
        })
    })
}

serial.port.on('open', () => serial.opening_date = Math.round(new Date()) );

serial.port.on('error', e => console.log(`Error closing serial port. ${e}`));

serial.port.on('close', () => {
    
    console.log('Serial Port closed');

    // CLOSES THE TAKE WEIGHT MODAL ON ALL USERS SO IF THE USE WANTS TO TAKE THE WEIGHT IT NEEDS TO OPEN THE PORT AGAIN
    io.sockets.emit('serial port has been closed');

    // REMOVE ALL USERS FROM SERIAL SOCKETS ARRAY
    serial.sockets = [];
    serial.opening_date = null;

    // RESET GLOBAL VARIABLES HERE!!!
    weight_value = 0;
    serial_value = null;
});

serial.port.on('data', async data => {

    if (transmitting_data) return;
    transmitting_data = true;

    try {

        const process_data = process_serial_data(data);
        if (process_data.weight === NaN || process_data.serial_value > 100000) {
            transmitting_data = false;
            return;
        }

        weight_value = process_data.weight;
        serial_value = process_data.serial_value;

        // SEND DATA ONLY TO SOCKETS THAT HAVE THE TAKE WEIGHT MODAL OPEN
        for (const socket of serial.sockets) {
            for (const s of io.sockets.sockets) {
                if (s[0] !== socket.id) continue;

                const targetSocket = s[1];
                if (!targetSocket.connected) continue;

                try { targetSocket.emit('transmitting serial data', process_data) }
                catch(e) { console.log(`Error sending data to socket. ${e}`) }
            }
        }

        await delay(80);
    }
    catch(e) { console.log(`Error sending serial data\n`, e) }
    finally { transmitting_data = false }
});

io.on('connection', socket => {

    socket.emit('chat-message', 'socket connected');

    socket.on('test', msg => { console.log(msg) })

    socket.on('open serial port', async () => {

        // FOR DEVELOPMENT ONLY
        if (process.env.NODE_ENV !== 'production') {
            
            console.log('opened connection');
            serial_opened = true;

            weight_interval = setInterval(() => {
                if (serial_opened) {
                    weight_value += (Math.floor(Math.random() * 6) + 1) * 100;
                    socket.emit('new weight dev', weight_value);    
                }
            }, 100);

            return;
        }
        
        //PRODUCTION -> OPEN SERIAL PORT ONLY
        try {

            // TRY AND FIND USER IF IT'S ALREADY IN ARRAY
            const findSocket = serial.sockets.find(({ id }) => id === socket.id);

            // PUSH USER TO ARRAY OR UPDATE IT
            if (findSocket) findSocket.created = Math.round(new Date());
            else serial.sockets.push({ id: socket.id, created: Math.round(new Date()) });

            console.log(serial.sockets);

            // PORT IS ALREADY OPEN 
            if (serial.port.isOpen) return;

            // OPEN PORT IF IT'S CLOSED
            serial.port.open();
            serial.opening_date = Math.round(new Date());

        }
        catch(err) {
            socket.emit('serial port connection error', err); 
            console.log('Error trying to open serial port');
        }
    });

    socket.on('accept weight', async weight_data => {

        // WHEN USER CLICKS THE ACCEPT BUTTON TO SAVE THE WEIGHT
        const response = { success: false };

        if (process.env.NODE_ENV === 'production') {
            try {

                weight_data.serial_value = serial_value;
                weight_data.weight_value = weight_value;
                console.log(weight_data);
                response.data = await save_weight_data(weight_data, process.env.NODE_ENV);

                if (serial.port.isOpen) serial.port.close();

                response.weight_id = weight_data.id;
                response.user = weight_data.user;
                response.success = true;
            }
            catch(error) { response.error = error }
            finally { io.sockets.emit('new weight updated', response) }
        }

        //DEVELOPMENT
        else {
            try {

                serial_opened = false;
                clearInterval(weight_interval);
                
                console.log('close connection in development mode');
                weight_data.weight_value = weight_value;
                weight_value = 0;
                response.data = await save_weight_data(weight_data, process.env.NODE_ENV);

                response.user = weight_data.user;
                response.success = true;

            }
            catch(error) { response.error = error }
            finally { io.sockets.emit('new weight updated', response) }
        }
    });

    socket.on('close serial port', () => {
        if (process.env.NODE_ENV === 'production') {
            if (serial.port.isOpen) serial.port.close();
        }
        else {
            clearInterval(weight_interval);
            weight_value = 0;    
        }
    });

    //WEIGHT HAS BEEN CREATED BY OTHER USER -> TELL OTHER USERS ABOUT
    socket.on('new weight created by other user', async weight_id => {
        try {

            const weight_data = await get_created_weight(weight_id); 
            io.sockets.emit('weight created by another user', weight_data);

        } catch(e) { error_handler('Error trying to send weight data through socket to other users.') }
    });

    //WEIGHT HAS BEEN ANNULED OR FINISHED BY USER -> TELL OTHER USERS OF IT
    socket.on('weight status changed', data => {
        io.sockets.emit('weight status changed by other user', data);
    });

    //GROSS WEIGHT HAS BEEN UPDATED -> TELL OTHER USERS ABOUT IT
    socket.on('gross weight updated by another user', weight => {
        io.sockets.emit('gross weight updated in one of the weights that are pending', weight);
    });

    //FIRST DOCUMENT OF PENDING WEIGHT HAS BEEN UPDATED -> TELL OTHER USERS ABOUT IT
    socket.on('weight object first documents client entity has been updated', entity_name => {
        io.sockets.emit('update pending weight entity in pending weights table', entity_name);
    });

    //GENERATE ELECTRONIC DOCUMENT
    socket.on('generate electronic document', async doc_id => {
        try { 
            const doc_data = await generate_electronic_document(doc_id, socket);
            console.log(`electronic document data is:`, doc_data);
            socket.emit('electronic document - finished generating document', doc_data);
        }
        catch(e) {
            console.log(`Error generating electronic document. ${e}`); 
            socket.emit('error generating electronic document', e);
        }
    });

    //UPDATE BANK BALANCE
    socket.on('update bank balance', async company_id => {
        try {

            //TELL ALL CLIENTS TO OPEN THE LOADER FOR THE COMPANY THAT'S GETTING UPDATED
            io.sockets.emit('bank balance - open loader div', company_id);

            const balance_data = await get_bank_balance(company_id, io);

            console.log(balance_data);

            io.sockets.emit('bank balance - finished updating balance', balance_data);

        } catch(e) { console.log(e); io.sockets.emit('error updating bank balance', { company_id: company_id, error: e}) }
    });

    //
    socket.on('document finished editing', () => {
        io.sockets.emit('update companies totals after document has been edited');
    });

    //A USER HAS CORRECTED ERRORS FOUND IN WEIGHTS IN DATABASE
    socket.on('ignore error in weights', async data => {
        
        const { ignored_errors } = data;

        try {

            const update_weight = weight_id => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        UPDATE weights 
                        SET ignore_error=1
                        WHERE id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve();
                    })
                })
            }

            for (const weight_id of ignored_errors) {
                await update_weight(weight_id)
            }

        }
        catch(e) { data.error = e }
        finally { io.sockets.emit('errors in weights have been updated', data) }
    })

    socket.on('get errors from server', async () => {

        const response = { success: false }

        try {
            response.errors = await check_for_server_errors();
            response.success = true;
        }
        catch(e) { response.error = e  }
        finally { socket.emit('finished checking for errors in servers', response) }
    })

    //SAVE KILOS TO ONLINE DB
    socket.on('update_kilos_web_hosting', async data => {
        return;
        try { update_kilos_web_hosting(data) }
        catch(err) { console.log(err) }
    });
});

socket_server.listen(3100);

//CHECK FOR ERRORS FUNCTIONS
const check_kilos_breakdown_errors = (season, errors) => {
    return new Promise(async (resolve, reject) => {

        const weights_with_errors = [];

        try {

            const get_finished_weights = () => {
                return new Promise((resolve, reject) => {
                    //WEIGHT THAT SHOULDN'T BE CHECKED
                    const weight = 29645;
                    conn.query(`
                        SELECT weights.id AS weight_id, weights.created, weights.primary_plates, weights.final_net_weight, 
                        header.id AS doc_id, body.kilos
                        FROM weights
                        INNER JOIN documents_header header ON weights.id=header.weight_id
                        INNER JOIN documents_body body ON header.id=body.document_id
                        WHERE (weights.created BETWEEN '${season.start}' AND '${season.end}')
                        AND (header.created BETWEEN '${season.start}' AND '${season.end}') AND weights.ignore_error=0
                        AND weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I')
                        AND weights.final_net_weight IS NOT NULL AND header.document_total IS NOT NULL AND weights.id <> ${weight}
                        ORDER BY weights.id ASC, header.id ASC, body.id ASC;
                    `, (error, results, fields) => {
                        if (error) return reject(error);
            
                        const weights = [];
                        let current_weight;
                        
                        for (let i = 0; i < results.length; i++) {
            
                            if (results[i].weight_id === current_weight) continue;
                            current_weight = results[i].weight_id;
            
                            const weight = {
                                id: results[i].weight_id,
                                date: results[i].created,
                                plates: results[i].primary_plates,
                                documents: [],
                                kilos: results[i].final_net_weight
                            }
            
                            let current_doc;
                            for (let j = i; j < results.length; j++) {
                                
                                if (weight.id !== results[j].weight_id) break;
                                if (current_doc === results[j].doc_id) continue;
                                current_doc = results[j].doc_id;
            
                                const document = {
                                    id: results[j].doc_id,
                                    rows: []
                                }
            
                                for (let k = j; k < results.length; k++) {
                                    if (document.id !== results[k].doc_id) break;
                                    document.rows.push({
                                        kilos: 1 * results[k].kilos
                                    })
                                }
            
                                weight.documents.push(document)
                            }
                            weights.push(weight);
                        }
            
                        return resolve(weights);
                    })
                })
            }

            const weights = await get_finished_weights();
    
            for (const weight of weights) {
                
                const total_kilos = weight.kilos;
    
                let kilos = 0;
                for (const document of weight.documents) {
                    for (const row of document.rows) { kilos += row.kilos }                
                }
    
                if (total_kilos !== kilos) {
                    console.log(`\r\nKilos breakdown in weight Nº ${weight.id} don't match.\r\nKilos in weight are: ${total_kilos}\r\nKilos in body are: ${kilos}\r\nDiference is: ${total_kilos - kilos}\r\n`);
                    errors.push({
                        id: weight.id,
                        date: new Date(weight.created).toLocaleString('es-CL').split(' ')[0],
                        plates: weight.plates,
                        message: `Desgloce de kilos no cuadra en el pesaje Nº ${weight.id}. Peso Neto es ${total_kilos} KG. Desgloce de kilos es ${kilos} KG. Hay una diferencia de ${total_kilos - kilos}`
                    });
                }
                
            }

            return resolve(weights_with_errors);
        } catch(e) { return reject(e) }
    })
}

const check_errors_in_weights_sum = (season, errors) => {
    return new Promise(async (resolve, reject) => {
        try {

            const get_weights_tare_containers = weight_id => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT container_code AS code, container_weight AS weight, container_amount AS amount 
                        FROM tare_containers
                        WHERE status='I' AND weight_id=${weight_id}
                        ORDER BY id ASC;
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve(results);
                    })
                })
            }

            const get_weights = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT 
                        header.weight_id, weights.created AS weight_date, weights.cycle AS cycle_id, cycles.name AS cycle_name, weights.primary_plates, 
                        weights.gross_brute, weights.gross_containers, weights.gross_net, weights.tare_brute, weights.tare_containers, weights.tare_net, weights.final_net_weight,
                        drivers.name AS driver, header.id AS doc_id, header.number AS doc_number, header.type AS doc_type, header.date AS doc_date, 
                        internal_entities.id AS internal_entity_id, internal_entities.short_name AS internal_entity, entities.name AS entity_name, body.id AS body_id,
                        header.client_entity AS entity_id, header.client_branch, branches.name AS branch_name, documents_comments.comments, body.product_code, body.product_name, 
                        body.cut, body.price, body.kilos, body.informed_kilos, body.container_code, containers.name AS container_name, body.container_amount, body.container_weight
                        FROM documents_header header
                        INNER JOIN weights ON header.weight_id=weights.id
                        INNER JOIN documents_body body ON header.id=body.document_id
                        LEFT OUTER JOIN documents_comments ON header.id=documents_comments.doc_id
                        INNER JOIN cycles ON weights.cycle=cycles.id
                        INNER JOIN internal_entities ON header.internal_entity=internal_entities.id
                        INNER JOIN entities ON header.client_entity=entities.id
                        INNER JOIN entity_branches branches ON header.client_branch=branches.id
                        LEFT OUTER JOIN products ON body.product_code=products.code
                        INNER JOIN containers ON body.container_code=containers.code
                        INNER JOIN vehicles ON weights.primary_plates=vehicles.primary_plates
                        INNER JOIN drivers ON weights.driver_id=drivers.id
                        WHERE weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I') AND weights.final_net_weight IS NOT NULL AND
                        (weights.created BETWEEN '${season.start}' AND '${season.end}') AND weights.ignore_error=0 AND
                        (header.created BETWEEN '${season.start}' AND '${season.end}') AND weights.cycle=1 
                        ORDER BY weights.id ASC, header.id ASC, body.id ASC;
                    `, async (error, results, fields) => {
                        if (error) return reject(error);
            
                        const weights = [];
            
                        let current_weight;
            
                        for (let i = 0; i < results.length; i++) {
            
                            if (current_weight === results[i].weight_id) continue;
                            current_weight = results[i].weight_id;
            
                            const weight = {
                                id: results[i].weight_id,
                                plates: results[i].primary_plates,
                                driver: results[i].driver,
                                created: results[i].weight_date,
                                cycle: {
                                    id: results[i].cycle_id,
                                    name: results[i].cycle_name
                                },
                                gross: {
                                    brute: results[i].gross_brute,
                                    containers: results[i].gross_containers,
                                    net: results[i].gross_net
                                },
                                tare: {
                                    brute: results[i].tare_brute,
                                    containers: results[i].tare_containers,
                                    net: results[i].tare_net
                                },
                                documents: [],
                                containers_weight: 0,
                                tare_containers_weight: 0
                            }
                            weights.push(weight);

                            //GET TARE CONTAINERS FOR WEIGHT
                            weight.tare_containers = await get_weights_tare_containers(weight.id);
                
                            for (const container of weight.tare_containers) {
                                weight.tare_containers_weight += (1 * container.weight * container.amount);
                            }

                            weight.tare_containers_weight = Math.floor(weight.tare_containers_weight);
            
                            //BUILD DOCUMENT OBJECTS FOR WEIGHT
                            let current_doc;
                            for (let j = i; j < results.length; j++) {
            
                                if (weight.id !== results[j].weight_id) break;
                                
                                if (current_doc === results[j].doc_id) continue;
                                current_doc = results[j].doc_id;
            
                                const document = {
                                    id: results[j].doc_id,
                                    date: results[j].doc_date,
                                    number: results[j].doc_number,
                                    entity: {
                                        id: results[j].entity_id,
                                        name: results[j].entity_name
                                    },
                                    branch: {
                                        id: results[j].client_branch,
                                        name: results[j].branch_name
                                    },
                                    rows: []
                                }
                                weight.documents.push(document);
            
                                for (let k = j; k < results.length; k++) {
                                    
                                    if (document.id !== results[k].doc_id) break;
                                    weight.containers_weight += (1 * results[k].container_weight * results[k].container_amount);
            
                                    document.rows.push({
                                        id: results[k].body_id,
                                        container: {
                                            code: results[k].container_code,
                                            weight: results[k].container_weight,
                                            amount: results[k].container_amount
                                        },
                                        product: {
                                            code: results[k].product_code,
                                            cut: results[k].cut,
                                            price: results[k].price,
                                            kilos: results[k].kilos,
                                            informed_kilos: results[k].informed_kilos
                                        }
                                    })
                                }
                                weight.containers_weight = Math.floor(weight.containers_weight);
                            }
                        }
            
                        return resolve(weights);
                    })
                })
            }

            const weights = await get_weights();

            for (const weight of weights) {

                if (weight.gross.containers !== weight.containers_weight) {
                    console.log(`\r\nContainers weight doesn't match sum of documents in weight Nº ${weight.id}\r\nweight gross containers are: ${weight.gross.containers} --- containers sum is: ${weight.containers_weight}`);
                    errors.push({
                        id: weight.id,
                        date: new Date(weight.created).toLocaleString('es-CL').split(' ')[0],
                        plates: weight.plates,
                        message: `El peso de los envases de los documentos descontados en el pesaje es ${weight.gross.containers} KG, y la suma de los envases de los documentos es ${weight.containers_weight} KG. Hay una diferencia de ${weight.gross.containers - weight.containers_weight} KG.`
                    });
                }
                
                if (1 * weight.tare.containers !== weight.tare_containers_weight) {
                    console.log(`\r\nTare containers weight doesn't match in weight Nº ${weight.id}\r\nweight tare_containers are: ${weight.tare.containers} --- containers sum is ${weight.tare_containers_weight}`);
                    errors.push({
                        id: weight.id,
                        date: new Date(weight.created).toLocaleString('es-CL').split(' ')[0],
                        plates: weight.plates,
                        message: `El peso de los envases descontados en el pesaje es ${weight.tare.containers} KG, y la suma de los envases de tara es ${weight.tare_containers_weight}. Hay una diferencia de ${weight.tare.containers - weight.tare_containers_weight} KG`
                    });
                }
    
                if (weight.gross.brute - weight.gross.containers !== weight.gross.net) {
                    console.log(`Error in sum of gross weight in weight Nº ${weight.id} --- should be ${weight.gross.brute - weight.gross.containers} and is ${weight.gross.net} `);
                    errors.push({
                        id: weight.id,
                        date: new Date(weight.created).toLocaleString('es-CL').split(' ')[0],
                        plates: weight.plates,
                        message: `No se descontaron bien los envases en el Peso Bruto. Peso Bruto Sin Envases debería ser ${weight.gross.brute - weight.gross.containers} KG pero el peso guardado es de ${weight.gross.net}. Hay una diferencia de ${weight.gross.brute - weight.gross.containers - weight.gross.net} KG`
                    });
                }
    
                if (weight.tare.brute - weight.tare.containers !== weight.tare.net) {
                    console.log(`Error in sum of tare weight in weight Nº ${weight.id} --- should be ${weight.tare.brute - weight.tare.containers} and is ${weight.tare.net} `)
                    errors.push({
                        id: weight.id,
                        date: new Date(weight.created).toLocaleString('es-CL').split(' ')[0],
                        plates: weight.plates,
                        message: `No se descontaron bien los envases en el Peso Tara. Peso Tara Sin Envases debería ser ${weight.tare.brute - weight.tare.containers} KG pero el peso guardado es de ${weight.tare.net}. Hay una diferencia de ${weight.tare.brute - weight.tare.containers - weight.tare.net} KG`
                    });
                }
    
            }

            return resolve();
        } catch(e) { return reject(e) }
    })
}

//CHECK DOCUMENTS THAT ARE SET AS TRASLADO BUT SHOULD BE A BUY OR SALE
const check_document_type_errors = (season, errors) => {
    return new Promise((resolve, reject) => {
        conn.query(`
        SELECT header.id AS doc_id, header.weight_id, weights.created, weights.primary_plates, drivers.name AS driver, 
        header.number, entities.name AS entity_name
        FROM documents_header header
        INNER JOIN weights ON header.weight_id=weights.id
        INNER JOIN entities ON header.client_entity=entities.id
        INNER JOIN drivers ON weights.driver_id=drivers.id
        WHERE header.type=1 AND header.document_total IS NOT NULL AND weights.final_net_weight IS NOT NULL 
        AND weights.final_net_weight > 0 AND header.document_total IS NOT NULL AND weights.ignore_error=0
        AND (header.created BETWEEN '${season.start}' AND '${season.end}') AND header.client_entity <> 183 AND
        weights.status='T' AND header.status='I' AND (weights.cycle=1 OR weights.cycle=2);
        `, (error, results, fields) => {
            if (error) return reject(error);

            let current_id;
            for (const row of results) {

                if (current_id === row.doc_id) continue;
                current_id = row.header_id;

                errors.push({
                    id: row.weight_id,
                    date: new Date(row.created).toLocaleString('es-CL').split(' ')[0],
                    plates: row.primary_plates,
                    message: `Documento Nº ${row.number} está guardado como traslado y debería ser compra/venta.`
                })

            }

            return resolve();
        })
    })
}

const check_for_server_errors = () => {
    return new Promise(async (resolve, reject) => {
        try {

            const current_season = await get_current_season();
            const errors = [];

            await check_kilos_breakdown_errors(current_season, errors);
            await check_errors_in_weights_sum(current_season, errors);

            //CHECK DOCUMENTS THAT ARE BUY/SALE BUT ARE SAVED AS TRANSPORT ONLY
            await check_document_type_errors(current_season, errors);

            console.log(errors,'\n-------------------------------\n');

            return resolve(errors);
        } catch(e) { return reject(e) }
    })
}

//CHECK ERRORS EVERY 30 MINUTES
const wait_time_for_checking_errors = 60 * 30 * 1000;
(async () => {

    try {

        const date = new Date();
        const date_minutes = date.getMinutes();
        const date_seconds = date.getSeconds();

        const pending_seconds = 60 - date_seconds;
        const pending_minutes = 59 - date_minutes;

        console.log(`Pending time until starting interval for checking errors is ${pending_minutes} minutes and ${pending_seconds} seconds.\n`)

        //WAIT UNTIL MINUTE 30 OR 0 TO START THE INTERVAL
        const wait_period = (pending_seconds * 1000) + (pending_minutes * 60 * 1000);
        await delay(wait_period);

        setInterval(async () => {
            try {

               const errors = await check_for_server_errors();
               if (errors.length > 0) io.sockets.emit('found errors in server', errors);

            } catch(error) { console.log(error) }
        }, wait_time_for_checking_errors);
    
    } catch(err) { console.log(`Error setting interval for function that checks errors. ${err}`) }
})();