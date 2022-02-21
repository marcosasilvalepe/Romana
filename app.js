const express = require('express');
const https = require('https');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');

const exphbs = require('express-handlebars');

const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' })

const conn = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
//const SerialPort = require('serialport');

const app = express();
//app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Handlebars
app.engine('.hbs', exphbs({ defaultLayout: 'main', extname: '.hbs' }));
app.set('view engine', '.hbs');

// STATIC FOLDER
app.use(express.static(path.join(__dirname, 'public')));

// LOGGING
let SerialPort;
if (process.env.NODE_ENV === 'production') SerialPort = require('serialport');
else { console.log('Using Morgan!'); app.use(morgan('dev')) }

// ROUTES -> NEEDS TO BE AFTER MORGAN
const endpoints = require('./routes/endpoints');

const error_handler = endpoints.error_handler;
app.use('/', endpoints.router);


//SSL STUFF
const PORT = process.env.PORT || 3443;

const key = fs.readFileSync(path.join(__dirname, 'cert', 'romana_cert.key'));
const cert = fs.readFileSync(path.join(__dirname, 'cert', 'romana_cert.crt'));

const sslServer = https.createServer({
    key: key, 
    cert: cert,
    requestCert: false,
    rejectUnauthorized: false
}, app);

sslServer.listen(PORT, () => { console.log(`Server listening on port: ${PORT}`) });

/*
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode in port ${PORT} - MYSQL Status is: ${conn.state}`));
*/

/************************* SOCKET STUFF ****************/

//SSL SOCKET STUFF
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

/*
const socket_server = require('http').createServer(app);
const io = require('socket.io')(socket_server, {
    cors: { origin: '*' }
});
*/

/*** WAIT DELAY FUNCTION ***/
function delay(delayValue) { return new Promise(resolve => setTimeout(resolve, delayValue)); }

const format_date = date => {
    let
    current_date = date.getDate(),
    current_month = date.getMonth() + 1,
    current_year = date.getFullYear(),
    current_hrs = date.getHours(),
    current_mins = date.getMinutes(),
    current_secs = date.getSeconds();

    // Add 0 before date, month, hrs, mins or secs if they are less than 0
    current_date = current_date < 10 ? '0' + current_date : current_date;
    current_month = current_month < 10 ? '0' + current_month : current_month;
    current_hrs = current_hrs < 10 ? '0' + current_hrs : current_hrs;
    current_mins = current_mins < 10 ? '0' + current_mins : current_mins;
    current_secs = current_secs < 10 ? '0' + current_secs : current_secs;

    return current_year + '-' + current_month + '-' + current_date + ' ' + current_hrs + ':' + current_mins + ':' + current_secs;
}

let weight_interval, weight_value = 0, serial_opened = false;

const serial = {};

if (process.env.NODE_ENV === 'production') {

	serial.port = new SerialPort(
        "/dev/ttyUSB0", 
        {
            baudRate: 9600,
            parser: new SerialPort.parsers.Readline('\n'),
            dataBits: 7,
            parity: 'none',
            topBits: 1,
            flowControl: false
        },
        false //openInmediately flag
    ).setEncoding('utf8');

	serial.opening_date = new Date();

	//CLOSES SERIAL PORT 3 MINUTES AFTER IT WAS OPENED -> CHECKS EVERY MINUTE
	setInterval(() => {
		if (new Date() - serial.opening_date > (60000 * 10) && serial.port.isOpen) 
            serial.port.close(() => { 
                console.log(`Serial Port closed automatically after ${Math.floor((new Date() - serial.opening_date) / 60000)}`)
            });
	}, 60000);

}

const save_weight_data = weight_data => {
    return new Promise(async (resolve, reject) => {

        const
        weight_id = weight_data.id,
        weight_value = weight_data.weight_value,
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
                        FROM weights WHERE id=${weight_id};
                    `, (error, results, fields) => {
                        if (error) return reject(error);
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
    
                    const brute_weight = (tara_type === 'A') ? weight_value : input_weight;
    
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
                            ${process}_date='${now}', 
                            ${process}_type='${tara_type}', 
                            ${process}_user=${user}, 
                            ${process}_brute=${brute_weight}, 
                            ${process}_net=${target_net}, 
                            final_net_weight=${final_net_weight} 
                        WHERE id=${weight_id};
                    `, (error, results, fields) => {
                        if (error) return reject(error);
                        return resolve();
                    })
                })
            }
     
            const check_if_manual_weight_row_exists = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT process FROM weights_manual_input WHERE process='${process}' AND weight_id=${weight_id};
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
                        SET manual_brute=${weight_value} 
                        WHERE process='${process}' AND weight_id=${weight_id};
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
                        VALUES (${weight_id}, '${process}', ${weight_value});
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
                        WHERE weights.id=${weight_id};
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
    
            await get_weight_data();
            await update_weight();

            if (tara_type === 'M') {
                const check_if_row_exists = await check_if_manual_weight_row_exists();
                if (check_if_row_exists) await update_manual_tara_weight();
                else await insert_manual_tara_weight();
            }

            await check_update();

            response.success = true;
            return resolve(response);

        }
        catch(e) { console.log(`Error updating brute weight in database. ${e}`); return reject(e) }
    })
}

const process_serial_data = data => {

    const 
    buffer = Buffer.from(data).toString().trim(),
    weight = buffer.substring(3, buffer.length - 2).trim().replace(/[^0-9]/gm, '');
    console.log(weight)
    return parseInt(weight);

}

const get_created_weight = weight_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.id, weights.cycle, weights.primary_plates, weights.gross_brute, drivers.name AS driver
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

io.on('connection', socket => {

    socket.emit('chat-message', 'socket connected');

    socket.on('test', msg => { console.log(msg) })

    socket.on('open serial', async userId => {

        if (process.env.NODE_ENV === 'production') {

		    console.log('Serial Port status is: ' + serial.port.isOpen);

            try {
			
                serial.port.on('error', e => {
                    throw `Error opening serial. ${e}`;
                });
                
                serial.opening_date = new Date();
                serial.user = userId;
                serial.opened = new Date();

                //PORT IS ALREADY OPEN AND THE SAME USER THAT OPENED IT TRIES TO ACCESS IT
                if (serial.port.isOpen) {

                    console.log('Port already open!');

                    serial.port.on('data', async data => {
                        await delay(300);
                        weight_value = process_serial_data(data);
                        socket.emit('transmitting serial data', weight_value);
                        await delay(50);
                    });

                } else {
                    console.log('Opening Serial Port');
                    serial.port.open();
                }

                serial.port.on('open', () => {

                    console.log('Serial Port is now open!');
                    
                    serial.port.on('data', async data => {
                        await delay(300);
                        weight_value = process_serial_data(data);
                        socket.emit('transmitting serial data', parseInt(weight_value));
                        await delay(100);
                    });

                });

            } catch(err) { socket.emit('serial port connection error', err); console.log('Error trying to open serial port') }
        }

        //DEVELOPMENT
        else {
            console.log('opened connection')
            serial_opened = true;
            weight_interval = setInterval(() => {
                if (serial_opened) {
                    weight_value += (Math.floor(Math.random() * 6) + 1) * 100;
                    socket.emit('new weight dev', weight_value);    
                }
            }, 50);        
        }
    });

    socket.on('close-serial', async weight_data => {

        const response = { success: false }

        if (process.env.NODE_ENV === 'production') {

            try {

                serial.port.close(() => { console.log('Serial Port closed'); });
                weight_data.weight_value = weight_value;
                weight_value = 0;
                response.data = await save_weight_data(weight_data);
                response.success = true;

            }
            catch(error) { response.error = error; }
            finally { 
                socket.emit('new weight updated', response);
            }
        }

        //DEVELOPMENT
        else {

            try {

                serial_opened = false;
                clearInterval(weight_interval);
                
                console.log('close connection');
                weight_data.weight_value = weight_value;
                weight_value = 0;
                response.data = await save_weight_data(weight_data);
                response.success = true;

            }
            catch(error) { response.error = error }
            finally { socket.emit('new weight updated', response) }
        }
        
    })

    socket.on('cancel-serial', () => {

        if (process.env.NODE_ENV === 'production') {
            
	        serial.port.close(() => { console.log('Serial Port closed'); });
            weight_value = 0;
        }

        else {
            clearInterval(weight_interval);
            weight_value = 0;    
        }
    })

    //WEIGHT HAS BEEN CREATED BY OTHER USER -> TELL OTHER USERS ABOUT
    socket.on('new weight created by other user', async weight_id => {
        try {

            const weight_data = await get_created_weight(weight_id); 
            socket.broadcast.emit('weight created by another user', weight_data);

        } catch(e) { error_handler('Error trying to send weight data through socket to other users.') }
    })

    //WEIGHT HAS BEEN ANNULED OR FINISHED BY USER -> TELL OTHER USERS OF IT
    socket.on('weight status changed', weight_id => {
        socket.broadcast.emit('weight status changed by other user', weight_id);
    })

    //GROSS WEIGHT HAS BEEN UPDATED -> TELL OTHER USERS ABOUT IT
    socket.on('gross weight updated by another user', weight => {
        socket.broadcast.emit('gross weight updated in one of the weights that are pending', weight);
    })

    //FIRST DOCUMENT OF PENDING WEIGHT HAS BEEN UPDATED -> TELL OTHER USERS ABOUT IT
    socket.on('weight object first documents client entity has been updated', entity_name => {
        socket.broadcast.emit('update pending weight entity in pending weights table', entity_name);
    })
});



socket_server.listen(3100);