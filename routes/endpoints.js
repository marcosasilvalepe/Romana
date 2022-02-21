const express = require('express');
const router = express.Router();
const conn = require('../config/db');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs/dist/bcrypt');
const jwt_auth_secret = process.env.ACCESS_TOKEN_SECRET;
const jwt_refresh_secret = process.env.REFRESH_TOKEN_SECRET;
const socket_domain = (process.env.NODE_ENV === 'development') ? 'localhost' : '192.168.1.66';

console.log(socket_domain)
const error_handler = msg => {
    return new Promise((resolve, reject) => {
        const now = new Date().toLocaleString('es-CL');
        fs.appendFile('error_log.txt', now + ' -> ' + msg + '\r\n\r\n', error => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

const validate_rut = rut => {
    return new Promise((resolve, reject) => {
        try {
            const
            new_rut = rut.replace(/[^0-9kK]/gm, ''),
            digits = new_rut.substring(0, new_rut.length - 1),
            digits_array = digits.split(''),
            dv = new_rut.substring(new_rut.length - 1).toLowerCase();
            
            let m = 2, sum = 0;
        
            for (let i = digits_array.length - 1; i >= 0; i--) {
                sum += m * parseInt(digits_array[i]);
                m++;
                if (m===8) m = 2; 
            }
        
            let new_dv = (11 - (sum % 11));
        
            if (new_dv === 11) new_dv = '0';
            else if (new_dv === 10) new_dv = 'k';
            else new_dv = new_dv.toString();
        
            if (dv === new_dv) return resolve(true);
            return resolve(false);        
        } catch(e) { return reject() }
    })
}

const format_rut = rut => {
    return new Promise(resolve => {

        rut = rut.replace(/[^0-9kK]/gm, '');

        let first_digits, middle_digits, last_digits, dv;
        if (rut.length < 9) {
            first_digits = rut.substring(0, 1);
            middle_digits = rut.substring(1, 4);
            last_digits = rut.substring(4,7);
        }
        else {
            first_digits = rut.substring(0, 2)
            middle_digits = rut.substring(2, 5);
            last_digits = rut.substring(5, 8);
        }
        dv = rut.substring(rut.length - 1).toUpperCase();
        return resolve(`${first_digits}.${middle_digits}.${last_digits}-${dv}`);    
    })
}

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

const validate_date = date => {
	try {
		new Date(date).toISOString();
		return true
	} catch(e) { return false }
}

const get_giros = () => {
    return new Promise((resolve, reject) => {
        conn.query(`SELECT id, giro FROM giros ORDER BY giro ASC;`, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_weight_data = weight_id => {

    weight_id = parseInt(weight_id);
    return new Promise(async (resolve, reject) => {

        const weight_object = {
            kilos: { informed: 0, internal: 0 },
            tare_containers: []
        };

        try {
            
            const get_weight_data = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT weights.cycle, cycles.name AS cycle_name, weights.status, weights.driver_id, drivers.name AS driver_name, 
                        drivers.rut AS driver_rut, weights.transport_id, entities.name AS transport_name, entities.rut AS transport_rut, 
                        weights.created, weights.kilos_breakdown, weights.primary_plates, weights.secondary_plates, weights.created_by AS user_id, weight_user.name AS user_name, 
                        weights.gross_status, weights.gross_date, weights.gross_type, weights.gross_user AS gross_user_id, 
                        gross_user.name AS gross_user_name, weights.gross_brute, 
                        weights.gross_containers, weights.gross_net, weight_comments.gross AS gross_comments, weights.tare_status, 
                        weights.tare_date, weights.tare_type, weights.tare_user AS tare_user_id, tare_user.name AS tare_user_name,
                        weights.tare_brute, weights.tare_containers, weights.tare_net, 
                        weight_comments.tare AS tare_comments, weights.final_net_weight 
                        FROM weights 
                        INNER JOIN cycles ON weights.cycle=cycles.id 
                        LEFT OUTER JOIN drivers ON weights.driver_id=drivers.id 
                        LEFT OUTER JOIN entities ON weights.transport_id=entities.id 
                        INNER JOIN users weight_user ON weights.created_by=weight_user.id 
                        LEFT OUTER JOIN users gross_user ON weights.gross_user=gross_user.id
                        LEFT OUTER JOIN users tare_user ON weights.tare_user=tare_user.id
                        LEFT OUTER JOIN weight_comments ON weights.id=weight_comments.weight_id 
                        WHERE weights.id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error || results.length === 0) return reject(error);

                        weight_object.cycle = { 
                            id: results[0].cycle, 
                            name: results[0].cycle_name 
                        };

                        weight_object.driver = { 
                            id: results[0].driver_id, 
                            name: results[0].driver_name, 
                            rut: results[0].driver_rut 
                        };

                        weight_object.final_net_weight = 1 * results[0].final_net_weight;
                        
                        weight_object.kilos_breakdown = (results[0].kilos_breakdown === 0) ? false : true;

                        weight_object.frozen = { 
                            id: weight_id, 
                            created: new Date(results[0].created).toLocaleString('es-CL'), 
                            created_by: { id: results[0].user_id, name: results[0].user_name },
                            primary_plates: results[0].primary_plates
                        };
                        
                        weight_object.gross_weight = { 
                            brute: 1 * results[0].gross_brute, 
                            containers_weight: 1 * results[0].gross_containers, 
                            net: 1 * results[0].gross_net,
                            status: results[0].gross_status,
                            type: results[0].gross_type,
                            user: {
                                id: results[0].gross_user_id,
                                name: results[0].gross_user_name
                            }
                        };
    
                        weight_object.gross_weight.date = (results[0].gross_date === null) ? null : new Date(results[0].gross_date).toLocaleString('es-CL');
                        weight_object.gross_weight.comments = (results[0].gross_comments === null) ? '' : results[0].gross_comments;
    
                        weight_object.secondary_plates = results[0].secondary_plates,
                        weight_object.status = results[0].status;

                        weight_object.tare_weight = {
                            brute: 1 * results[0].tare_brute, 
                            containers_weight: 1 * results[0].tare_containers, 
                            net: 1 * results[0].tare_net,
                            status: results[0].tare_status,
                            type: results[0].tare_type,
                            user: {
                                id: results[0].tare_user_id,
                                name: results[0].tare_user_name
                            }
                        };
    
                        weight_object.tare_weight.date = (results[0].tare_date === null) ? null : new Date(results[0].tare_date).toLocaleString('es-CL');
                        weight_object.tare_weight.comments = (results[0].tare_comments === null) ? '' : results[0].tare_comments;
    
                        weight_object.transport = { 
                            id: results[0].transport_id, 
                            name: (results[0].transport_id === 235) ? '' : results[0].transport_name, 
                            rut: (results[0].transport_id === 235) ? '' : results[0].transport_rut 
                        };
                        return resolve();
                    })
                })
            }
    
            const get_tare_containers = () => {
                return new Promise((resolve, reject) => {
                    conn.query(`
                        SELECT tare_containers.id, tare_containers.container_code AS code, tare_containers.container_weight AS weight, 
                        tare_containers.container_amount AS amount, containers.name 
                        FROM tare_containers 
                        INNER JOIN containers ON tare_containers.container_code=containers.code 
                        WHERE tare_containers.status='I' AND tare_containers.weight_id=${parseInt(weight_id)};
                    `, (error, results, fields) => {
                        if (error) return reject(error);

                        results.forEach(row => {
                            const container = {
                                amount: row.amount,
                                code: row.code,
                                id: row.id,
                                name: row.name,
                                saved: false,
                                weight: row.weight
                            };
                            weight_object.tare_containers.push(container);
                        })
                        return resolve();
                    })
                })
            }

            await get_weight_data();
            const documents_data = await get_weight_documents(weight_id, weight_object.cycle.id);
            weight_object.documents = documents_data.documents;
            weight_object.kilos = documents_data.kilos;
            await get_tare_containers();

            const 
            gross = weight_object.gross_weight.status,
            tare = weight_object.tare_weight.status;
    
            let process;
    
            if (gross === tare) process = 'gross';
            else if (gross > tare && gross !== 3) process = 'gross';
            else if (tare > gross && tare !== 3) process = 'tare';
            else if (gross === 3 && tare < 3) process = 'tare';
            else if (tare === 3 && gross < 3) process = 'gross';
            else process = 'gross';
    
            weight_object.default_data = { process: process, cycle: weight_object.cycle.id };

            return resolve(weight_object);

        } catch(error) { return reject(error); }
    })
}

const get_weight_documents = (weight_id, cycle) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.id, header.date, header.sale, header.electronic, header.client_entity AS client_id, 
            entities.name AS client_name, header.client_branch AS client_branch_id, 
            entity_branches.name AS client_branch_name, header.internal_entity AS internal_id, 
            internal_entities.name AS internal_name, header.internal_branch AS internal_branch_id, 
            internal_branches.name AS internal_branch_name, header.created, header.created_by AS user_id, 
            users.name AS user_name, header.number, header.document_total AS total, documents_comments.comments 
            FROM documents_header header 
            LEFT OUTER JOIN entities ON header.client_entity=entities.id 
            LEFT OUTER JOIN entity_branches ON header.client_branch=entity_branches.id 
            LEFT OUTER JOIN internal_entities ON header.internal_entity=internal_entities.id 
            LEFT OUTER JOIN internal_branches ON header.internal_branch=internal_branches.id 
            LEFT OUTER JOIN documents_comments ON header.id=documents_comments.doc_id 
            INNER JOIN users ON header.created_by=users.id 
            WHERE (header.status='T' OR header.status='I') AND 
            header.weight_id=${weight_id} ORDER BY header.id ASC;
        `, async (error, results, fields) => {
            if (error) return reject(error);

            const data = {
                documents: [],
                kilos: { informed: 0, internal: 0 }
            };

            for (let i = 0; i < results.length; i++) {

                const document = {
                    client: {
                        branch: { 
                            id: results[i].client_branch_id, 
                            name: results[i].client_branch_name 
                        }, 
                        entity: { 
                            id: results[i].client_id, 
                            name: results[i].client_name 
                        }
                    },
                    comments: results[i].comments,
                    date: new Date(results[i].date).toISOString().split('T')[0] + ' 00:00:00',
                    sale: (results[i].sale === 0) ? false : true,
                    electronic: (results[i].electronic === 0) ? false : true,
                    number: results[i].number,
                    frozen: { 
                        created: new Date(results[i].created).toLocaleString('es-CL'), 
                        id: results[i].id,
                        user: { 
                            id: results[i].user_id, 
                            name: results[i].user_name 
                        }
                    },
                    internal: {
                        branch: { 
                            id: results[i].internal_branch_id, 
                            name: results[i].internal_branch_name 
                        },
                        entity: { 
                            id: results[i].internal_id, 
                            name: results[i].internal_name 
                        }
                    },
                    rows: [],
                    total: 1 * results[i].total
                };
                
                const rows = await get_document_rows(results[i].id);
                let containers = 0, containers_weight = 0, kilos = 0, informed_kilos = 0;

                rows.forEach(row => {
                    const row_obj = {
                        container: { 
                            amount: row.container_amount,
                            code: row.container_code, 
                            name: row.container_name, 
                            weight: row.container_weight
                        },
                        id: row.id,
                        product: { 
                            code: row.product_code,
                            cut: row.cut,
                            informed_kilos: row.informed_kilos,
                            kilos: row.kilos,
                            last_price: { found: false }, 
                            name: row.product_name, 
                            price: row.price, 
                            total: row.product_total 
                        }
                    }
                    
                    containers += 1 * row.container_amount;
                    containers_weight += (1 * row.container_weight) * (1 * row.container_amount);

                    kilos += 1 * row.kilos;
                    informed_kilos += 1 * row.informed_kilos;
                    document.rows.push(row_obj);
                });

                document.containers = containers;
                document.containers_weight = containers_weight;
                if (cycle === 1) document.kilos = informed_kilos;
                else document.kilos = kilos;

                data.documents.push(document);
                data.kilos.informed += informed_kilos;
                data.kilos.internal += kilos;

            }
            return resolve(data);
        })
    })
}

const get_document_rows = (doc_id) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT body.id, body.product_code, body.cut, products.name AS product_name, body.price, 
            body.kilos, body.informed_kilos, body.product_total, body.container_code, 
            containers.name AS container_name, body.container_weight, body.container_amount 
            FROM documents_body body
            LEFT OUTER JOIN products ON body.product_code=products.code 
            LEFT OUTER JOIN containers ON body.container_code=containers.code 
            WHERE (body.status='I' OR body.status='T') AND document_id=${doc_id}
            ORDER BY body.id ASC;;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const reset_kilos_breakdown = (weight_id, cycle) => {
    return new Promise(async (resolve, reject) => {

        const reset_breakdown_kilos_with_equal_fields = (doc_id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_body AS body
                    INNER JOIN documents_header AS header ON body.document_id=header.id
                    SET body.kilos=NULL, body.informed_kilos=NULL
                    WHERE header.id=${doc_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const reset_breakdown_kilos_single_field = (doc_id) => {
            return new Promise((resolve, reject) => {

                const field = (cycle === 1) ? 'kilos' : 'informed_kilos';

                conn.query(`
                    UPDATE documents_body AS body
                    INNER JOIN documents_header AS header ON body.document_id=header.id
                    SET body.${field}=NULL
                    WHERE header.id=${doc_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const delete_kilos_breakdown = (doc_id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT body.kilos, body.informed_kilos 
                    FROM documents_header header 
                    INNER JOIN documents_body body ON header.id=body.document_id
                    WHERE (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    AND header.id=${doc_id};
                `, async (error, results, fields) => {
                    if (error) return reject(error);

                    let equal_kilos = true;
                    for (let i = 0; i < results.length; i++) {
                        if (results[i].kilos !== results[i].informed_kilos) {
                            equal_kilos = false;
                            break;
                        }  
                    }

                    if (equal_kilos) await reset_breakdown_kilos_with_equal_fields(doc_id);
                    else await reset_breakdown_kilos_single_field(doc_id);

                    return resolve();
                })
            })
        }

        const check_weight_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE (header.status='I' OR header.status='T') AND header.weight_id=${parseInt(weight_id)}; 
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results);
                })
            })
        }

        const update_kilos_breakdown_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET kilos_breakdown=0 WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const documents = await check_weight_documents();
        for (let i = 0; i < documents.length; i++) { await delete_kilos_breakdown(documents[i].id) }

        await update_kilos_breakdown_status();
        return resolve();
    })
}

const get_cookie = (request, cookie) => {
    if (!request.headers.cookie) return undefined;
    
    const cookie_array = request.headers.cookie.split(';');
    for (let i = 0; i < cookie_array.length; i++) {
        const c = cookie_array[i].split('=');
        if (c[0].trim() === cookie) return c[1].trim();
    }
    return undefined;
}

const todays_date = () => {
    const 
    now = new Date(),
    year = now.getFullYear(),
    month = (now.getMonth() + 1 < 10) ? '0' + (now.getMonth() + 1) : now.getMonth() + 1,
    day = (now.getDate() < 10) ? '0' + now.getDate() : now.getDate(),
    hour = now.toLocaleString('es-CL').split(' ')[1];
    return year + '-' + month + '-' + day + ' ' + hour;
}

const userMiddleware = {
    isLoggedIn: (req, res, next) => {
        try {

            const 
            token = get_cookie(req, 'jwt'),
            decoded = jwt.verify(token, jwt_refresh_secret);

            req.userData = decoded;
            next();

        } catch (err) { return res.status(401).render('401') }
    }
}

const get_vehicles = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT vehicles.id, vehicles.primary_plates, vehicles.secondary_plates, drivers.name AS driver, 
            drivers.phone, vehicles.internal, vehicles.status 
            FROM vehicles 
            LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id 
            WHERE vehicles.internal=1 AND vehicles.status=1 ORDER BY vehicles.primary_plates ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

router.get('/java_dev', userMiddleware.isLoggedIn, (req, res, next) => {
    res.sendFile('openjdk.msi', { root: path.join(__dirname) }, error => {
        if (error) next(error);
        else {
            console.log('File Sent');
            next();
        }
    })
})

router.get('/qz_tray', userMiddleware.isLoggedIn, (req, res, next) => {
    res.sendFile('qz-tray.exe', { root: path.join(__dirname) }, error => {
        if (error) next(error);
        else {
            console.log('File Sent');
            next();
        }
    })
})

//CHECK FOR documents_body ERRORS IN TOTAL
router.post('/documents_body_errors', async (req, res) => {

    response = { success: false }

    try {

        const update_product_total = (id, total) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_body
                    SET product_total=${total}
                    WHERE id=${id};
                `, (error, results, fields) => {
                    if (error) return reject (error);
                    return resolve();
                })
            })
        }

        const get_body_rows = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.weight_id, weights.cycle, header.id AS doc_id, body.id AS body_id, body.price, body.kilos, body.informed_kilos, body.product_total
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I')
                    AND body.price IS NOT NULL AND body.kilos IS NOT NULL AND body.informed_kilos IS NOT NULL LIMIT 50;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results);
                })
            })
        }

        const rows = await get_body_rows();
        for (let i = 0; i < rows.length; i++) {
            
            const
            weight_id = rows[i].weight_id,
            cycle = rows[i].cycle,
            doc_id = rows[i].doc_id,
            price = rows[i].price,
            kilos = rows[i].informed_kilos,
            product_total = rows[i].product_total;

            if (price * kilos !== product_total) update_product_total(body_id, price * kilos);
        }

        response.success = true;

    }
    catch(e) { console.log(e) }
    finally { res.json(response) }
})

//  Login / Landing Page
router.get('/', (req, res) => {

    res.render('login', {
        title: 'Login',
        css: [
            { 
                path: 'css/login.css',
                attributes: [{ attr: 'type', value: 'text/css' }]
            },
            { 
                path: 'fontawesome/css/all.css',
                attributes: [{ attr: 'type', value: 'text/css' }]
            }
        ]
    })
})

router.get('/app', userMiddleware.isLoggedIn, async (req, res) => {

    res.render('home', { 
        title: 'Comercial Lepefer Ltda.',
        css: [ 
            { 
                path: 'css/loader.css',
                attributes: [{ attr: 'type', value: 'text/css' }]
                
            }, 
            { 
                path: 'css/main.css',
                attributes: [{ attr: 'type', value: 'text/css' }]
            }, 
            { 
                path: 'fontawesome/css/all.css',
                attributes: [{ attr: 'type', value: 'text/css' }]
            },
            {
                path: 'css/custom-animations.css',
                attributes: [{ attr: 'type', value: 'text/css' }]
            } 
        ],
        script: [
            { 
                src: `https://${socket_domain}:3100/socket.io/socket.io.js`,
                attributes: [ 'defer' ]
            }
        ]
    });
})

router.post('/login_user', async (req, res) => {

    const 
    { user, password } = req.body,
    temp = {},
    response = { success: false };

    try {

        const get_user_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM users 
                    WHERE LOWER(name)=LOWER(${conn.escape(user)});
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    
                    temp.user = {
                        id: results[0].id,
                        username: results[0].name,
                        profile: results[0].profile, 
                    }
                    temp.active = (results[0].active === 0) ? false : true;
                    temp.password = results[0].password;
                    return resolve();  

                })
            })
        }

        const update_refresh_token = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE users SET refresh_token='${response.refresh_token}' WHERE LOWER(name)=LOWER(${conn.escape(user)})
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await get_user_data();
        const validate_password = await bcrypt.compare(password, temp.password);
        if (validate_password) {

            const 
            token = jwt.sign({
                userName: temp.user.username,
                userId: temp.user.id,
                userProfile: temp.user.profile
              },
              jwt_auth_secret, {
                expiresIn: '10m'
              }
            ),
            refresh_token = jwt.sign({
                userName: temp.user.username,
                userId: temp.user.id,
                userProfile: temp.user.profile
              },
              jwt_refresh_secret, {
                expiresIn: '15d'
            });

            response.token = token;
            response.refresh_token = refresh_token;
            await update_refresh_token();

            res.cookie("jwt", refresh_token, {
                secure: process.env.NODE_ENV !== "development",
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 15 * 24 * 60 * 60 * 1000 //7 days
            });
        }

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error logging user in. ${e}`);
        error_handler(`Endpoint: /login_user -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.get('/refresh_token', async (req, res) => {

    const 
    temp = {},
    response = { success: false };

    try {

        const check_refresh_token = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT refresh_token FROM users WHERE id=${conn.escape(user_id)};
                `, (error, results, fields) => {

                    if (error || results.length === 0) return reject(error);
                    temp.token = results[0].refresh_token;
                    return resolve(true);                    
                })
            })
        }

        const update_refresh_token = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE users SET refresh_token='${response.refresh_token}' WHERE LOWER(name)=LOWER(${conn.escape(user_id)})
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }


        const refresh_token = get_cookie(req, 'jwt');
        if (refresh_token === undefined) throw 'No refresh token';

        const
        decoded_token = jwt.decode(refresh_token),
        user_id = decoded_token.userId;

        if (jwt.verify(refresh_token, jwt_refresh_secret)) {
            const check_refresh = await check_refresh_token();
            if (check_refresh) {
                
                //GENERATE NEW TOKEN
                response.token = jwt.sign({
                    userName: decoded_token.userName,
                    userId: decoded_token.userId,
                    userProfile: decoded_token.userProfile
                },
                jwt_auth_secret, {
                    expiresIn: '10m'
                });

                //GENERATE NEW REFRESH TOKEN
                const new_refresh_token = jwt.sign({
                    userName: decoded_token.userName,
                    userId: decoded_token.userId,
                    userProfile: decoded_token.userProfile
                  },
                  jwt_refresh_secret, {
                    expiresIn: '15d'
                });

                await update_refresh_token();

                res.cookie("jwt", new_refresh_token, {
                    secure: process.env.NODE_ENV !== "development",
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 15 * 24 * 60 * 60 * 1000 //7 days
                });

            } else response.error = `token didn't match`;
        } else response.no_token = true;

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error refreshing token. ${e}`);
        error_handler(`Endpoint: /refresh_token -> \r\n${e}`);
    }
    finally { res.json(response) }
})

router.get('/print', userMiddleware.isLoggedIn, async (req, res) => {

    res.render('print', {
        title: 'Comercial Lepefer Ltda.',
        css: [
            { path: 'css/main.css' } 
        ],
    })
})

router.post('/print_document', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { doc_id } = req.body,
    response = { success: false };

    try {

        const get_header_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.primary_plates, weights.secondary_plates, drivers.name AS driver_name, drivers.rut AS driver_rut,
                    header.number, header.date, entities.name AS entity_name, entity_branches.name AS entity_branch, 
                    entities.rut AS entity_rut, entity_branches.address, comunas.comuna, giros.giro 
                    FROM documents_header header
                    LEFT OUTER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON header.client_entity=entities.id
                    LEFT OUTER JOIN entity_branches ON header.client_branch=entity_branches.id
                    INNER JOIN comunas ON entity_branches.comuna=comunas.id
                    INNER JOIN giros ON entities.giro=giros.id
                    WHERE header.id=${doc_id};
                `, (error, results, fields) => {

                    if (error || results.length === 0) return reject(error);
                    
                    response.doc_data = {
                        driver: {
                            name: results[0].driver_name,
                            rut: results[0].driver_rut
                        },
                        vehicle: {
                            primary_plates: results[0].primary_plates,
                            secondary_plates: results[0].secondary_plates
                        },
                        entity: {
                            name: results[0].entity_name,
                            rut: results[0].entity_rut,
                            address: results[0].address,
                            comuna: results[0].comuna,
                            giro: results[0].giro
                        },
                        number: results[0].number,
                        date: results[0].date,
                        rows: []
                    }
                    return resolve();
                })
            })
        }

        const get_row_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT body.container_amount, containers.name AS container_name, products.name AS product_name, body.cut, 
                    body.price, body.kilos
                    FROM documents_body body
                    INNER JOIN documents_header header ON body.document_id=header.id
                    LEFT OUTER JOIN containers ON body.container_code=containers.code
                    LEFT OUTER JOIN products ON body.product_code=products.code
                    WHERE header.id=${doc_id} AND (body.status='T' OR body.status='I');
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    for (let i = 0; i < results.length; i++) {
                        response.doc_data.rows.push({
                            container: {
                                amount: results[i].container_amount,
                                name: results[i].container_name
                            },
                            product: {
                                cut: results[i].cut,
                                name: results[i].product_name,
                                kilos: results[i].kilos,
                                price: results[i].price
                            }
                        })
                    }
                    return resolve();
                })
            })
        }

        await get_header_data();
        await get_row_data();
        response.success = true;
    }
    catch(e) {
        response.error = e;
        console.log(`Error getting data to print document. ${e}`);
        error_handler(`Endpoint: /print_document -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { console.log(response);res.json(response) }
})

router.post('/get_file_version', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { file } = req.body,
    response = { success: false }

    try {

        const get_version = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT version FROM client_file_versions WHERE file=${conn.escape(file)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.version = results[0].version;
                    return resolve();
                })
            })
        }

        await get_version();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting file last version. ${e}`);
        error_handler(`Endpoint: /get_file_version -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

/********************** HOME *********************/

router.get('/grapes_data', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { 
        success: false,
        seasons: [],
        total: { packing: 0, parron: 0 }
    };

    try {

        const get_seasons_dates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT * FROM seasons WHERE id <> 3;`, (error, results, fields) => {
                    if (error) return reject(error);

                    for (let i = 0; i < results.length; i++) {
                        response.seasons.push({
                            id: results[i].id,
                            name: results[i].name, 
                            start: results[i].beginning.toISOString().split('T')[0],
                            end: (results[i].ending === null) ? todays_date().split(' ')[0] : results[i].ending.toISOString().split('T')[0]
                        });
                    }
                    return resolve();
                })
            })
        }

        const get_kilos = (code, cut) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(body.kilos) AS kilos 
                    FROM documents_body body
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE body.product_code='${code}' AND body.cut='${cut}' AND weights.status='T' AND weights.cycle=1
                    AND (header.status='I' OR header.status='T')
                    AND (body.status='I' OR body.status='T') 
                    AND (
                        weights.created BETWEEN 
                            '${response.seasons[response.seasons.length - 1].start} 00:00:00' 
                            AND '${response.seasons[response.seasons.length - 1].end} 23:59:59'
                    );
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(1 * results[0].kilos);
                })
            })
        }
    
        const get_grapes_varietes = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT products.code, products.name, products.type, products.color, products.image
                    FROM documents_body body
                    INNER JOIN products ON body.product_code=products.code
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE weights.cycle=1 AND weights.status='T' AND products.type='Uva'
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    AND (
                        weights.created BETWEEN 
                            '${response.seasons[response.seasons.length - 1].start} 00:00:00' 
                            AND '${response.seasons[response.seasons.length - 1].end} 23:59:59'
                        )
                    GROUP BY products.name ORDER BY products.name ASC;
                `, async (error, results, fields) => {
                        
                    if (error) return reject(error);

                    response.products = results;
                    for (let i = 0; i < response.products.length; i++) {

                        const 
                        packing = 1 * await get_kilos(response.products[i].code, 'Packing'),
                        parron = 1 * await get_kilos(response.products[i].code, 'Parron');

                        response.products[i].total = packing + parron;
                        response.products[i].kilos = { packing: packing, parron: parron };
                        response.total.packing += packing;
                        response.total.parron += parron;
                    }
                    return resolve();
                })
            })
        }

        await get_seasons_dates();
        await get_grapes_varietes();
        response.success = true;
    }
    catch(e) {
        response.error = e;
        console.log(`Error getting data for pie charts. ${e}`);
        error_handler(`Endpoint: /grapes_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response); }
})

router.get('/get_kilos_by_providers', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false }

    try {

        const get_seasons_dates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT * FROM seasons WHERE id=1;`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.season = { 
                        name: results[0].name, 
                        beginning: results[0].beginning.toISOString().split('T')[0],
                        ending: results[0].ending.toISOString().split('T')[0]
                    };
                    return resolve();
                })
            })
        }

        const get_providers_kilos = (id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(body.kilos) AS kilos
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    INNER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN products ON body.product_code=products.code
                    WHERE weights.status='T' AND weights.cycle=1 AND products.type='Uva' AND
                    (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    AND (header.date BETWEEN '${response.season.beginning}' AND '${response.season.ending}')
                    AND header.client_entity=${id}
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].kilos);
                })
            })
        }

        const get_providers = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entities.id, entities.name
                    FROM documents_body body
                    INNER JOIN products ON body.product_code=products.code
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE weights.cycle=1 AND weights.status='T' AND products.type='Uva' AND
                    (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    AND (header.date BETWEEN '${response.season.beginning}' AND '${response.season.ending}')
                    GROUP BY entities.name ORDER BY entities.name ASC;
                `, async (error, results, fields) =>{

                    if (error) return reject(error);

                    response.providers = results;
                    for (let i = 0; i < response.providers.length; i++) {
                        const kilos = await get_providers_kilos(response.providers[i].id);
                        response.providers[i].kilos = kilos;
                    }
                    return resolve();
                })
            })
        }

        await get_seasons_dates();
        await get_providers();

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting kilos by providers. ${e}`);
        error_handler(`Endpoint: /get_kilos_by_providers -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/get_products_by_date', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { cycle, product_type, start_date, end_date} = req.body,
    response = { 
        success: false, 
        season: { 
            name: null, 
            start: req.body.start_date, 
            end: req.body.end_date 
        },
        total: { 
            packing: 0, 
            parron: 0 
        }
    };

    try {

        const get_kilos = (code, cut) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(body.kilos) AS kilos 
                    FROM documents_body body
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE body.product_code='${code}' AND cut='${cut}' AND weights.status='T' AND weights.cycle=${conn.escape(cycle)}
                    AND (header.status='I' OR header.status='T') 
                    AND (body.status='I' OR body.status='T') 
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59');
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].kilos);
                })
            })
        }
    
        const get_grapes_varietes = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT products.code, products.name, products.type, products.color, products.image
                    FROM documents_body body
                    INNER JOIN products ON body.product_code=products.code
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE weights.cycle=${conn.escape(cycle)} AND weights.status='T' AND products.type=${conn.escape(product_type)}
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59')
                    GROUP BY products.name ORDER BY products.name ASC;
                `, async (error, results, fields) => {
                        
                    if (error) return reject(error);
                    response.products = results;
                    for (let i = 0; i < response.products.length; i++) {

                        const 
                        packing = 1 * await get_kilos(response.products[i].code, 'Packing'),
                        parron = 1 * await get_kilos(response.products[i].code, 'Parron');

                        response.products[i].total = packing + parron;
                        response.products[i].kilos = { packing: packing, parron: parron };
                        response.total.packing += packing;
                        response.total.parron += parron;
                    }
                    return resolve();
                })
            })
        }

        const get_warehouse_kilos = (code, cut) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(body.kilos) AS kilos 
                    FROM documents_body body
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE body.product_code='${code}' AND cut='${cut}' AND weights.status='T' 
                    AND ((weights.cycle=1 AND header.client_entity=183 AND header.client_branch=241) OR weights.cycle=3)
                    AND (header.status='I' OR header.status='T')
                    AND (body.status='I' OR body.status='T') 
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59');
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].kilos);
                })
            })
        }

        const get_warehouse_receptions = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT products.code, products.name, products.type, products.color, products.image
                    FROM documents_body body
                    INNER JOIN products ON body.product_code=products.code
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE ((weights.cycle=1 AND header.client_entity=183) OR weights.cycle=3)
                    AND weights.status='T' AND products.type=${conn.escape(product_type)}
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59') 
                    GROUP BY products.name ORDER BY products.name ASC;
                `, async (error, results, fields) => {
                    if (error) return reject(error);
                    response.products = results;

                    for (let i = 0; i < response.products.length; i++) {
                        
                        const 
                        packing = 1 * await get_warehouse_kilos(response.products[i].code, 'Packing'),
                        parron = 1 * await get_warehouse_kilos(response.products[i].code, 'Parron');

                        response.products[i].total = packing + parron;
                        response.products[i].kilos = { packing: packing, parron: parron };
                        response.total.packing += packing;
                        response.total.parron += parron;
                    }
                    return resolve();
                })
            })
        }

        if (!validate_date(start_date)) throw 'Fecha inválida.';
        if (!validate_date(end_date)) throw 'Fecha inválida.';

        if (cycle === 3) await get_warehouse_receptions();
        else await get_grapes_varietes();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting products by date. ${e}`);
        error_handler(`Endpoint: /get_products_by_date -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/get_products_movements', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { cycle, start_date, end_date, product_code} = req.body,
    cycle_sql = (cycle === 3) ? `AND ((weights.cycle=1 AND header.client_entity=183) OR weights.cycle=3)` : `AND weights.cycle=${cycle}`,
    response = { 
        success: false,
        code: product_code,
        packing: 0,
        parron: 0
    };

    try {

        const get_client_kilos = (id, cut) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(body.kilos) AS kilos
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE body.product_code=${conn.escape(product_code)} AND body.cut='${cut}'
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59') 
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    ${cycle_sql} AND header.client_entity=${id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(1 * results[0].kilos);
                })
            })
        }

        const get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.client_entity AS id, entities.name
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    INNER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE body.product_code=${conn.escape(product_code)} 
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59') 
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T') 
                    ${cycle_sql} AND weights.status='T'
                    GROUP BY header.client_entity;
                `, async (error, results, fields) => {

                    if (error) return reject(error);
                    response.clients = results;

                    for (let i = 0; i < response.clients.length; i++) {
                        response.clients[i].kilos = {};                    
                        response.clients[i].kilos.packing = await get_client_kilos(response.clients[i].id, 'packing');
                        response.clients[i].kilos.parron = await get_client_kilos(response.clients[i].id, 'parron');
                        response.clients[i].total = response.clients[i].kilos.packing + response.clients[i].kilos.parron;
                        
                        response.packing += response.clients[i].kilos.packing;
                        response.parron += response.clients[i].kilos.parron;
                    }
                    return resolve();
                })
            })
        }

        if (!validate_date(start_date)) throw 'Fecha inválida.';
        if (!validate_date(end_date)) throw 'Fecha inválida.';

        await get_entities();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.error(`Error getting products movements. ${e}`);
        error_handler(`Endpoint: /get_products_movements -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response); console.log(response) }
});

router.post('/get_product_documents', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { client_id, product_code, cycle, start_date, end_date } = req.body,
    response = { success: false };

    try {

        const get_documents_kilos = (id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(kilos) AS kilos
                    FROM documents_body 
                    WHERE product_code=${conn.escape(product_code)} AND document_id=${id} AND (status='T' OR status='I');
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].kilos);
                })
            })
        }

        const get_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id, weights.gross_date AS date, header.number, entity_branches.name AS branch, weights.primary_plates AS plates
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    INNER JOIN entity_branches ON header.client_branch=entity_branches.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE body.product_code=${conn.escape(product_code)} 
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59') 
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T') 
                    AND weights.cycle=${conn.escape(cycle)} AND weights.status='T' AND header.client_entity=${conn.escape(client_id)}
                    GROUP BY header.weight_id;
                `, async (error, results, fields) => {

                    if (error) return reject(error);
                    response.data = results;
                    for (let i = 0; i < results.length; i++) {
                        results[i].kilos = await get_documents_kilos(results[i].id);
                    }
                    return resolve();
                })
            })
        }        

        if (!validate_date(start_date)) throw 'Fecha inválida.';
        if (!validate_date(end_date)) throw 'Fecha inválida.';

        await get_documents();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting product documents. ${e}`);
        error_handler(`Endpoint: /get_product_documents -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

/********************** WEIGHTS AND DOCUMENTS *********************/

router.post('/check_existing_plates', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { plates } = req.body,
    response = { success: false }

    try {

        const check_plates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id
                    FROM vehicles 
                    WHERE primary_plates=${conn.escape(plates)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(false);
                    return resolve(true);
                })
            })
        }

        const vehicle_exists = await check_plates();
        if (vehicle_exists) throw 'Patente de vehículo ya existe en base de datos.';

        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error checking vehicle's plates. ${e}`);
        error_handler(`Endpoint: /check_existing_plates -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_vehicle', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { primary_plates } = req.body,
    driver_id = (req.body.driver_id.length === 0) ? null : parseInt(req.body.driver_id),
    secondary_plates = (req.body.secondary_plates.length === 0) ? null : req.body.secondary_plates,
    status = (req.body.status) ? 1 : 0,
    internal = (req.body.internal) ? 1 : 0,
    transport_id = (req.body.transport_id === 'none') ? null : parseInt(req.body.transport_id),
    response = { success: false };

    try {

        const create_vehicle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO vehicles (status, internal, primary_plates, secondary_plates, transport_id, driver_id, created_by)
                    VALUES (
                        ${status},
                        ${internal},
                        ${conn.escape(primary_plates)},
                        ${conn.escape(secondary_plates)},
                        ${transport_id},
                        ${driver_id},
                        ${req.userData.userId}
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicle = { id: results.insertId };
                    return resolve();
                })
            })
        }

        const check_insert = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver, drivers.phone
                    FROM vehicles 
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    WHERE vehicles.id=${response.vehicle.id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.created = results[0];
                    return resolve();
                })
            })
        }

        await create_vehicle();
        await check_insert();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error creating new vehicle. ${e}`);
        error_handler(`Endpoint: /create_vehicle -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.get('/list_pending_weights', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false };

    try {

        const get_pending_weight_first_doc = (weight_id) => {
            return new Promise(async (resolve, reject) => {
                conn.query(`
                    SELECT entities.name
                    FROM documents_header header
                    INNER JOIN entities ON header.client_entity=entities.id
                    WHERE header.weight_id=${parseInt(weight_id)} AND (header.status='T' OR header.status='I')
                    ORDER BY header.id ASC LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    const name = (results.length === 0) ? null : results[0].name;
                    return resolve(name);
                })
            })
        }

        const get_pending_weights = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.id, weights.created, weights.cycle, weights.primary_plates, weights.gross_brute, drivers.name AS driver
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    LEFT OUTER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE weights.status='I' GROUP BY weights.id ORDER BY weights.id DESC;
                `, async (error, results, fields) => {
                    if (error) return reject(error);
                    for (let i = 0; i < results.length; i++) {
                        results[i].name = await get_pending_weight_first_doc(results[i].id);
                    }
                    response.pending_weights = results;
                    return resolve();
                })
            })
        }

        await get_pending_weights();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting pending weights. ${e}`);
        error_handler(`Endpoint: /list_pending_weights -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_vehicles', userMiddleware.isLoggedIn, async (req, res) => {

    const
    target = req.body.vehicles,
    response = { success: false }

    try {

        let search_query;
        if (target==='internal') { search_query = `SELECT vehicles.id, vehicles.primary_plates, vehicles.secondary_plates, drivers.name AS driver, drivers.phone, vehicles.internal, vehicles.status FROM vehicles LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id WHERE vehicles.internal=1 AND vehicles.status=1 ORDER BY vehicles.primary_plates ASC;`; }
        else if (target==='external') { search_query = `SELECT vehicles.id, vehicles.primary_plates, vehicles.secondary_plates, drivers.name AS driver, drivers.phone, vehicles.internal, vehicles.status FROM vehicles LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id WHERE vehicles.internal=0 AND vehicles.status=1 ORDER BY vehicles.primary_plates ASC;` }
        else if(target==='inactive') { search_query = `SELECT vehicles.id, vehicles.primary_plates, vehicles.secondary_plates, drivers.name AS driver, drivers.phone, vehicles.internal, vehicles.status FROM vehicles LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id WHERE vehicles.status=0 ORDER BY vehicles.primary_plates ASC;` }
        
        const get_vehicles = () => {
            return new Promise((resolve, reject) => {
                conn.query(search_query, (error, results, fields) => {
                    if (error) return reject(error);
                    response.data = results;
                    return resolve();
                })
            })
        }

        await get_vehicles();
        response.success = true;
    }
    catch (e) { 
        console.log(`Error searching for vehicles. Error msg: ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /get_vehicles -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.get('/get_transport', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false };

    try {
    
        get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name FROM entities WHERE type='T' ORDER BY name ASC;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }
        
        await get_entities();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error in /get_transport. ${e}`);
        error_handler(`Endopint: /get_transport ->User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.get('/get_vehicles', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false }

    try {
        
        response.data = await get_vehicles();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting weight template. ${e}`);
        error_handler(`Endpoint: /get_vehicles -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/check_primary_plates', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { plates } = req.body,
    response = { success: false }

    try {

        const check_plates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id FROM vehicles WHERE primary_plates=${conn.escape(plates)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) return resolve(true);
                    return resolve(false);
                })
            })
        }

        const get_drivers = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT * FROM drivers WHERE internal=1 ORDER BY name ASC;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.drivers = results;
                    return resolve();
                })
            })
        }

        response.existing = await check_plates();
        await get_drivers();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error checking plates in database`, e);
        error_handler(`Endpoint: /check_primary_plates -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_vehicle', userMiddleware.isLoggedIn, async (req, res) => {
    
    const
    { primary_plates, internal, status, driver_id, transport_id } = req.body,
    user = 1,
    secondary_plates = (req.body.secondary_plates === '') ? null : req.body.secondary_plates,
    response = { success: false, exists: false }

    try {

        const check_if_vehicle_exists = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id FROM vehicles WHERE primary_plates=${conn.escape(primary_plates)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) response.exists = true;
                    return resolve();
                })
            })
        }

        const create_vehicle = () => {
            return new Promise((resolve, reject) => {
                let insert_query;
                if (secondary_plates === null) insert_query = `
                    INSERT INTO vehicles (status, internal, primary_plates, transport_id, driver_id, created_by) 
                    VALUES (
                        ${conn.escape(status)}, 
                        ${conn.escape(internal)}, 
                        ${conn.escape(primary_plates)}, 
                        ${conn.escape(transport_id)}, 
                        ${conn.escape(driver_id)}, 
                        ${conn.escape(user)}
                    );
                `;
                else insert_query = `
                    INSERT INTO vehicles (status, internal, primary_plates, secondary_plates, transport_id, driver_id, created_by) 
                    VALUES (
                        ${conn.escape(status)}, 
                        ${conn.escape(internal)}, 
                        ${conn.escape(primary_plates)}, 
                        ${conn.escape(secondary_plates)}, 
                        ${conn.escape(transport_id)}, 
                        ${conn.escape(driver_id)}, 
                        ${conn.escape(user)}
                    );
                `;
                conn.query(insert_query, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_created_vehicle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT * FROM vehicles WHERE primary_plates=${conn.escape(primary_plates)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.new_vehicle = { 
                            id: results[0].id, 
                            status: results[0].status, 
                            internal: results[0].internal, 
                            primary_plates: results[0].primary_plates, 
                            secondary_plates: results[0].secondary_plates 
                        }
                        response.success = true;
                    }
                    return resolve();
                })
            })
        }

        await check_if_vehicle_exists();
        if (!response.exists) {
            await create_vehicle();
            await check_created_vehicle();
        }
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error creating new vehicle. ${e}`);
        error_handler(`Endpoint: /create_vehicle -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.get('/get_document_entities', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false };

    try {

        const get_internal_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name, short_name FROM internal_entities WHERE status=1;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.internal = { entities: results };
                    return resolve();
                })
            })
        }

        const get_internal_branches = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name FROM internal_branches WHERE status = 1;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.internal.branches = results;
                    response.success = true;
                    return resolve();
                })
            })
        }

        await get_internal_entities();
        await get_internal_branches();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting document template. ${e}`);
        error_handler(`Endpoint: /get_document_entities -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/search_vehicle', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { partial_plate } = req.body,
    response = { 
        success: false,
        vehicle_found: false
    };

    try {

        const search_vehicle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.id, vehicles.primary_plates, vehicles.driver_id, drivers.name 
                    FROM vehicles 
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id 
                    WHERE vehicles.primary_plates=${conn.escape(partial_plate)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.vehicle_found = true;
                        response.data = { 
                            plates: results[0].primary_plates, 
                            driver: { 
                                id: results[0].driver_id, 
                                name: results[0].name 
                            }    
                        }    
                    }
                    return resolve();
                })
            })
        }
        await search_vehicle();
        response.success = true;   
    }
    catch (e) { 
        console.log(`Error searching for vehicle. Error msg: ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /search_vehicle -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/create_new_weight', userMiddleware.isLoggedIn, async (req, res) => {

    const
    created = format_date(new Date()),
    created_by = req.userData.userId,
    { cycle } = req.body,
    primary_plates = req.body.plates,
    weight_object = {},
    response = { success: false };

    try {

        const user_preferences = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT weight_process, weight_cycle FROM users_preferences WHERE user=${created_by};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    weight_object.default_data = { 
                        process: results[0].weight_process, 
                        cycle: results[0].weight_cycle 
                    };
                    return resolve();
                })
            })
        }
        
        const delete_everything = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    DELETE FROM documents_body WHERE document_id > 6069;
                    ALTER TABLE documents_body AUTO_INCREMENT=8265;
                    DELETE FROM documents_header WHERE id > 6069; 
                    ALTER TABLE documents_header AUTO_INCREMENT=6070; 
                    DELETE FROM weights WHERE id > 27269; 
                    ALTER TABLE weights AUTO_INCREMENT=27270; 
                    DELETE FROM tare_containers; 
                    ALTER TABLE tare_containers AUTO_INCREMENT=1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const plates_related_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.primary_plates, vehicles.secondary_plates, vehicles.transport_id, entities.rut AS transport_rut, 
                    entities.name AS transport_name, vehicles.driver_id, drivers.name AS driver_name, drivers.rut AS driver_rut 
                    FROM vehicles 
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id 
                    LEFT JOIN entities ON vehicles.transport_id=entities.id 
                    WHERE vehicles.primary_plates=${conn.escape(primary_plates)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    
                    weight_object.frozen = { 
                        created: new Date(created).toLocaleString('es-CL'),
                        primary_plates: results[0].primary_plates
                    };

                    weight_object.secondary_plates = results[0].secondary_plates;
 
                    weight_object.transport = {
                        id: results[0].transport_id,
                        name: results[0].transport_name,
                        rut: results[0].transport_rut
                    };

                    weight_object.driver = {
                        id: results[0].driver_id,
                        name: results[0].driver_name,
                        rut: results[0].driver_rut
                    };
                    return resolve();
                });
            })
        }

        const user_name_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name AS created_by_name FROM users WHERE id=${conn.escape(created_by)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    weight_object.frozen.created_by = {
                        id: created_by,
                        name: results[0].created_by_name
                    };
                    return resolve();
                })
            })
        }

        const cycle_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM cycles WHERE id=${conn.escape(cycle)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    weight_object.cycle = {
                        id: cycle,
                        name: results[0].name
                    };
                    return resolve();
                });
            })
        }

        const last_weights_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, tare_date, tare_net 
                    FROM weights 
                    WHERE primary_plates=${conn.escape(primary_plates)} AND status='T' 
                    AND tare_brute > 2000 ORDER BY id DESC LIMIT 3;
                `, (error, results, fields) => {
                    if (error) return reject(error);

                    weight_object.last_weights = results;

                    if (results.length === 0) weight_object.average_weight = 0;
                    else {
                        
                        let average_weight = 0;
                        for (let i = 0; i < results.length; i++) { average_weight += results[i].tare_net; }
                        weight_object.average_weight = Math.floor(average_weight/(results.length * 10)) * 10;    
                    }

                    return resolve();
                });
            })
        }

        const create_weight_row = () => {
            return new Promise((resolve, reject) => {
                
                const sec_plates = (weight_object.secondary_plates === null) ? null : `'${weight_object.secondary_plates}'`;
                
                conn.query(`
                    INSERT INTO weights (
                        created, 
                        created_by, 
                        cycle, 
                        status, 
                        primary_plates, 
                        secondary_plates, 
                        driver_id, 
                        transport_id,
                        kilos_breakdown,
                        gross_status, 
                        gross_type, 
                        tare_status, 
                        tare_type
                    )

                    VALUES (
                        '${created}', 
                        ${weight_object.frozen.created_by.id}, 
                        ${weight_object.cycle.id}, 
                        'I', 
                        '${weight_object.frozen.primary_plates}', 
                        ${sec_plates}, 
                        ${weight_object.driver.id}, 
                        ${weight_object.transport.id},
                        0,
                        1, 
                        'A', 
                        1, 
                        'A'
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);

                    weight_object.kilos = { 
                        informed: 0, 
                        internal: 0 
                    };

                    weight_object.kilos_breakdown = false;
                    weight_object.final_net_weight = 0;
                    weight_object.frozen.id = results.insertId;
                    weight_object.status = 1;
                    weight_object.documents = [];
                    weight_object.tare_containers = [];

                    weight_object.gross_weight = { 
                        brute: 0, 
                        comments: '', 
                        date: null, 
                        net: 0, 
                        status: 1, 
                        type: 'A', 
                        user: null, 
                        containers_weight: 0 
                    };
                    weight_object.tare_weight = { 
                        brute: 0, 
                        comments: '', 
                        date: null, 
                        net: 0, 
                        status: 1, 
                        type: 'A', 
                        user: null, 
                        containers_weight: 0 
                    };
                    response.weight_object = weight_object;
                    response.success = true;
                    return resolve();
                })
            })
        }

        await user_preferences();
        //if (process.env.NODE_ENV === 'development') await delete_everything(); //ONLY USED WHILE DEVELOPING
        await plates_related_data();
        await user_name_data();
        await cycle_data();
        await last_weights_data();
        await create_weight_row();

    }
    catch(e) { 
        console.log(`Error creating new weight. Error msg: ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /create_new_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_pending_weight', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id } = req.body,
    response = { success: false };

    try {

        const last_weights_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, tare_date, tare_net 
                    FROM weights WHERE primary_plates='${response.weight_object.frozen.primary_plates}' 
                    AND status='T' AND tare_brute > 2000 ORDER BY id DESC LIMIT 3;
                `, (error, results, fields) => {
                    if (error) return reject(error);

                    response.weight_object.last_weights = results;

                    if (results.length === 0) response.weight_object.average_weight = 0;
                    else {
                        let average_weight = 0;
                        for (let i = 0; i < results.length; i++) { average_weight += results[i].tare_net; }
                        response.weight_object.average_weight = Math.floor(average_weight/(results.length * 10)) * 10;    
                    }

                    return resolve();
                });
            })
        }

        response.weight_object = await get_weight_data(weight_id);
        await last_weights_data();

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting pending weight. ${e}`);
        error_handler(`Endpoint: /get_pending_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/change_weight_status', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id, status } = req.body,
    response = { success: false }

    try {

        const change_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weights SET status=${conn.escape(status)} WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await change_status();

        if (status === 'T') response.status = 'TERMINADO';
        else if (status === 'N') response.status = 'ANULADO';
        else response.status = 'PENDIENTE';

        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error changing weight status to finished. ${e}`);
        error_handler(`Endpoint: /change_weight_status_to_finished -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/annul_weight', userMiddleware.isLoggedIn, async (req, res) => {
    
    const
    { weight_id } = req.body,
    response = { success: false }

    try {

        const delete_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET status='N' WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_delete = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT status FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.status = results[0].status;
                    return resolve();
                })
            })
        }

        const get_pending_weight_first_doc = (weight_id) => {
            return new Promise(async (resolve, reject) => {
                conn.query(`
                    SELECT entities.name
                    FROM documents_header header
                    INNER JOIN entities ON header.client_entity=entities.id
                    WHERE header.weight_id=${parseInt(weight_id)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    const name = (results.length === 0) ? null : results[0].name;
                    return resolve(name);
                })
            })
        }

        const get_pending_weights = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.id, weights.cycle, weights.primary_plates, weights.gross_brute, weights.created
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    WHERE weights.status='I' GROUP BY weights.id ORDER BY weights.id DESC;
                `, async (error, results, fields) => {
                    if (error) return reject(error);
                    for (let i = 0; i < results.length; i++) {
                        results[i].name = await get_pending_weight_first_doc(results[i].id);
                    }
                    response.pending_weights = results;
                    return resolve();
                })
            })
        }        

        await delete_weight();
        await check_delete();
        await get_pending_weights();
        if (response.status === 'N') response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting weight. ${e}`);
        error_handler(`Endpoint: /annul_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/finalize_weight', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {weight_id} = req.body,
    response = { success: false }

    try {

        const finalize_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET status='T' WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_finalize = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT status FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.status = results[0].status;
                    return resolve();
                })
            })
        }

        const get_pending_weight_first_doc = (weight_id) => {
            return new Promise(async (resolve, reject) => {
                conn.query(`
                    SELECT entities.name
                    FROM documents_header header
                    INNER JOIN entities ON header.client_entity=entities.id
                    WHERE header.weight_id=${parseInt(weight_id)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    const name = (results.length === 0) ? null : results[0].name;
                    return resolve(name);
                })
            })
        }

        const get_pending_weights = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.id, weights.cycle, weights.primary_plates, weights.gross_brute
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    WHERE weights.status='I' GROUP BY weights.id ORDER BY weights.id DESC;
                `, async (error, results, fields) => {
                    if (error) return reject(error);
                    for (let i = 0; i < results.length; i++) {
                        results[i].name = await get_pending_weight_first_doc(results[i].id);
                    }
                    response.pending_weights = results;
                    return resolve();
                })
            })
        }

        
        await finalize_weight();
        await check_finalize();
        await get_pending_weights();
        response.success = true;
    }
    catch (e) { 
        response.error = e; 
        console.log(`Error finalizing weight. ${e}`);
        error_handler(`Endpoint: /finalize_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/reset_weight_data', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id, process } = req.body,
    response = { success: true }

    try {

        const check_weight_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT ${process}_status AS status FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(parseInt(results[0].status));
                })
            })
        }

        const reset_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weights 
                    SET 
                        ${process}_status=1, 
                        ${process}_date=NULL, 
                        ${process}_type=NULL, 
                        ${process}_user=NULL, 
                        ${process}_brute=NULL 
                    WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_reset = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT ${process}_status AS status, ${process}_date AS date, ${process}_type AS type, ${process}_user AS user, 
                    ${process}_brute AS brute 
                    FROM weights WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.data = {
                        status: results[0].status,
                        date: results[0].date,
                        type: results[0].type,
                        user: results[0].user,
                        brute: 1 * results[0].brute
                    }
                    return resolve();
                })
            })
        }

        const status = await check_weight_status();
        if (status === 2) {
            await reset_weight();
            await check_reset()
        }
    }
    catch(e) { 
        console.log(`Error resetting weight. ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /reset_weight_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/save_weight', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id, process } = req.body,
    response = { success: false };

    try {

        const check_weight_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT ${process}_status AS status FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(parseInt(results[0].status));
                })
            })
        }

        const update_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET ${process}_status=3 WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT ${process}_status AS status FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.process = process;
                    response.status = results[0].status;
                    return resolve();
                })
            })
        }

        const status = await check_weight_status();
        if (status === 2) {
            await update_status();
            await check_update();
        }
        response.success = true;
    }
    catch(e) { 
        console.log(`Error updating weight status. ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /save_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_weight_comments', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id, process, comments } = req.body,
    response = { success: false };

    try {

        const check_existing_comments = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT weight_id FROM weight_comments WHERE weight_id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length===0) return resolve(false);
                    return resolve(true);
                })
            })
        }

        const insert_comments = () => {
            return new Promise((resolve, reject) => {
                conn.query(`INSERT INTO weight_comments (weight_id, ${process}) VALUES (${parseInt(weight_id)}, ${conn.escape(comments)});`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.success = true;
                    return resolve();            
                })
            })
        }

        const update_comments = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weight_comments SET ${process}=${conn.escape(comments)} WHERE weight_id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.success = true;
                    return resolve();
                })
            })
        }

        const existing_row = await check_existing_comments();
        if (existing_row) await update_comments();
        else await insert_comments();

    }
    catch(e) { 
        response.error = e; 
        console.log(e);
        error_handler(`Endpoint: /update_weight_comments -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/save_comments_and_sec_plates', userMiddleware.isLoggedIn, async (req, res) => {
    
    const
    { weight_id, process, secondary_plates, comments } = req.body,
    response = { success: false }
    
    try {

        const check_existing_comments = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT comments 
                    FROM weight_comments 
                    WHERE process=${conn.escape(process)} AND weight_id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length===0) return resolve(false);
                    return resolve(true);
                })
            })
        }

        const insert_comments = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO weight_comments (weight_id, process, comments) 
                    VALUES (${parseInt(weight_id)}, ${conn.escape(process)}, ${comments});
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const update_comments = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weight_comments 
                    SET 
                        comments=${conn.escape(comments)} 
                    WHERE weight_id=${parseInt(weight_id)} AND process=${conn.escape(process)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const update_secondary_plates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET secondary_plates=${conn.escape(secondary_plates)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        if (comments !== null) {
            const existing_comments = check_existing_comments();
            if (existing_comments) await update_comments();
            else await insert_comments();
        }
        if (secondary_plates !== null) await update_secondary_plates();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving weight. ${e}`);
        error_handler(`Endpoint: /save_comments_and_sec_plates -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/finalize_weight', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {weight_id} = req.body,
    response = { success: false }

    try {

        const update_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET status='T' WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await update_status();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error finalizing weight. ${e}`);
        error_handler(`Endpoint: /finalize_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/create_new_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity_name, entity_rut, entity_giro, entity_type, branch_name, branch_comuna, branch_address } = req.body,
    branch_phone = (req.body.branch_phone === '') ? null : req.body.branch_phone,
    response = { success: false, existing_entity: { found: false } }

    try {

        const check_if_entity_exists = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT status, type, rut, name, phone, email FROM entities WHERE rut='${formatted_rut}';`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.existing_entity.found = true;
                        response.existing_entity.entity = results;
                        return resolve(true);
                    }
                    return resolve(false);
                })
            })
        }

        const insert_new_entity = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO entities (status, type, rut, name, giro) 
                    VALUES (1, ${conn.escape(entity_type)}, '${formatted_rut}', ${conn.escape(entity_name)}, ${conn.escape(entity_giro)});
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.new_entity = { id: results.insertId, name: entity_name }
                    return resolve();
                })
            })
        }

        const insert_new_branch = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO entity_branches (entity_id, name, comuna, address, phone) 
                    VALUES (${response.new_entity.id}, ${conn.escape(branch_name)}, ${conn.escape(branch_comuna)}, ${conn.escape(branch_address)}, ${conn.escape(branch_phone)});
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.new_branch = { id: results.insertId, name: branch_name }
                    return resolve();
                })
            })
        }

        if (!validate_rut(entity_rut)) throw 'RUT Inválido';

        const formatted_rut = format_rut(entity_rut);
        const check_existing_entity = await check_if_entity_exists();

        if (check_existing_entity) response.success = true;
        else {
            await insert_new_entity();
            await insert_new_branch();
            response.success = true;
        }
    }
    catch(e) { 
        response.error = e;
        console.log(`Error creating entity. ${e}`);
        error_handler(`Endpoint: /create_new_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_tara', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id, process } = req.body,
    tara_type = req.body.type.substring(0,1).toUpperCase(),
    response = { success: false }

    try {

        const check_process_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT ${process}_status AS status FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].status);
                })
            })
        }

        const update_tara = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET ${process}_type='${tara_type}' WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const status = await check_process_status();
        if (status !== 2) await update_tara();
        else response.unauthorized_message = 'No se puede cambiar Tipo de Tara si existe captura de peso.';
        response.success = true;
    }
    catch(e) { 
        response.error = e;
        console.log(`Error updating tara. ${e}`); 
        error_handler(`Endpoint: /update_tara -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_cycle', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id } = req.body,
    existing_doc = {},
    cycle_object = { 
        new: parseInt(req.body.cycle) 
    },
    field = (cycle_object.new === 1) ? 'client' : 'internal',
    response = { 
        success: false, 
        documents: { 
            existing: false, 
            docs: [] 
        }
    };

    try {

        const check_weight_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT cycle, status FROM weights WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    cycle_object.current = results[0].cycle;
                    if (results[0].status === 'I') return resolve(true);
                    return resolve(false);
                })
            })
        }

        const check_existing_document = (number, entity) => {
            return new Promise((resolve, reject) => {
                console.log(`SELECT header.id, header.client_entity AS entity_id, entities.name AS entity_name, 
                header.number AS doc_number 
                FROM documents_header header 
                INNER JOIN entities ON header.client_entity=entities.id 
                INNER JOIN weights ON header.weight_id=weights.id 
                WHERE header.number=${number} AND header.${field}_entity=${entity} AND 
                (header.status='I' OR header.status='T') AND weights.cycle=${cycle_object.new} AND weights.id <> ${parseInt(weight_id)};`);
                conn.query(`
                    SELECT header.id, header.client_entity AS entity_id, entities.name AS entity_name, 
                    header.number AS doc_number 
                    FROM documents_header header 
                    INNER JOIN entities ON header.client_entity=entities.id 
                    INNER JOIN weights ON header.weight_id=weights.id 
                    WHERE header.number=${number} AND header.${field}_entity=${entity} AND 
                    (header.status='I' OR header.status='T') AND weights.cycle=${cycle_object.new} AND weights.id <> ${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(false);
                    return resolve(true);
                })
            })
        }

        const check_existing_correlative = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, number, ${field}_entity AS entity 
                    FROM documents_header 
                    WHERE weight_id=${parseInt(weight_id)} AND status='I';
                `, async (error, results, fields) => {

                    if (error) return reject(error);
                    console.log(results)
                    if (results.length === 0) return resolve(true);
                    
                    let can_change_cycle = true;
                    for (let i = 0; i < results.length; i++) {

                        const 
                        id = results[i].id, 
                        number = results[i].number,
                        entity = results[i].entity;

                        if (number !== null && entity !== null) {

                            const existing_document = await check_existing_document(number, entity);
                            console.log(existing_document)
                            if (existing_document) {
                                can_change_cycle = false;
                                existing_doc.number = number;
                                existing_doc.entity = entity;
                                response.documents.message = `Documento con correlativo=${number} y entidad=${entity} en campo ${field}_entity ya existe para el ciclo=${cycle_object.new}. ID=${id}`;
                                break;
                            }
                        }                
                    }
                    return resolve(can_change_cycle);
                })
            })
        }

        const update_documents_body = (row_id, kilos, informed_kilos) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_body 
                    SET 
                        kilos=${kilos}, 
                        informed_kilos=${informed_kilos} 
                    WHERE id=${row_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const update_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT body.id, body.kilos, body.informed_kilos 
                    FROM documents_body body 
                    INNER JOIN documents_header header ON body.document_id=header.id 
                    INNER JOIN weights ON header.weight_id=weights.id 
                    WHERE (header.status='T' OR header.status='I') AND (body.status='T' OR body.status='I') 
                    AND weights.id=${parseInt(weight_id)};
                `, async (error, results, fields) => {
                    if (error) return reject(error);

                    for (let i = 0; i < results.length; i++) {

                        const
                        row_id = results[i].id,
                        kilos = results[i].informed_kilos, 
                        informed_kilos = results[i].kilos;

                        if (!(kilos === null && informed_kilos === null)) 
                            await update_documents_body(row_id, kilos, informed_kilos);
                    }
                    return resolve();
                })
            })
        }

        const update_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weights 
                    SET cycle=${cycle_object.new} 
                    WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const last_weights_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, tare_date, tare_net 
                    FROM weights 
                    WHERE primary_plates='${response.weight_object.frozen.primary_plates}' AND status='T' 
                    AND tare_brute > 2000 
                    ORDER BY id DESC LIMIT 3;
                `, (error, results, fields) => {
                    
                    if (error) return reject(error);
                    response.weight_object.last_weights = results;

                    let average_weight = 0;
                    for (let i = 0; i < results.length; i++) { average_weight += results[i].tare_net; }
                    response.weight_object.average_weight = Math.floor(average_weight/(results.length * 10)) * 10;

                    return resolve();
                });
            })
        }

        //DELETE THIS AFTERWARDS
        const check_weight_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM documents_header
                    WHERE weight_id=${parseInt(weight_id)} AND (status='I' OR status='T');
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(true);
                    return resolve(false);
                })
            })
        }

        //DELETE THIS AFTERWARDS
        const get_new_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT name FROM cycles WHERE id=${cycle_object.new};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject();
                    response.cycle = { 
                        id: cycle_object.new,
                        name: results[0].name
                    }
                    return resolve();
                })
            })
        }

        const allowed_1 = await check_weight_status();
        if (!allowed_1) throw 'No se puede cambiar el ciclo ya que el estado actual del pesaje no permite cambios.';

        const allowed_2 = await check_weight_documents();
        if (!allowed_2) throw 'No se puede cambiar el ciclo ya que el pesaje tiene documentos ingresados.';

        await update_cycle();
        await get_new_cycle();

        /*
        const allowed_2 = await check_existing_correlative();
        if (!allowed_2) throw `Nº de documento ${existing_doc.number} ya existe para origen: ${existing_doc.entity}`;

        await update_cycle();
        if (cycle_object.current === 1 && cycle_object.new > 1) await update_documents();
        else if (cycle_object.current > 1 && cycle_object.new === 1) await update_documents();

        response.weight_object = await get_weight_data(weight_id);
        await last_weights_data();
        */

        response.success = true;
    }
    catch(e) { 
        console.log(`Error updating cycle. ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /update_cycle -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_secondary_plates', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {weight_id} = req.body,
    plates = (req.body.plates === null) ? null : `${req.body.plates}`,
    response = { success: false };
    
    try {

        const update_secondary_plates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weights 
                    SET secondary_plates=${conn.escape(plates)} 
                    WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve()
                })
            })
        }

        const check_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT secondary_plates 
                    FROM weights 
                    WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.plates = results[0].secondary_plates;
                    response.success = true;
                    return resolve();
                })
            })
        }

        await update_secondary_plates();
        await check_update();
    }
    catch(e) { 
        response.error = e; 
        console.log(e);
        error_handler(`Endpoint: /update_secondary_plates -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_driver', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { name, rut, phone, internal, active } = req.body,
    temp = {},
    response = { success: false };

    try {

        const existing_driver_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT name, rut 
                    FROM drivers 
                    WHERE rut='${temp.new_rut}'
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(false);
                    response.existing_driver = { 
                        name: results[0].name, 
                        rut: results[0].rut 
                    }
                    return resolve(true);
                })
            })
        }

        const create_driver = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO drivers (rut, name, phone, internal, active) 
                    VALUES (
                        '${temp.new_rut}', 
                        ${conn.escape(name)}, 
                        ${conn.escape(phone)}, 
                        ${conn.escape(internal)}, 
                        ${conn.escape(active)}
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.driver = { id: results.insertId }
                    return resolve();
                })
            })
        }

        const check_driver = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT rut, name, phone, internal, active 
                    FROM drivers 
                    WHERE id=${response.driver.id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.driver.rut = results[0].rut;
                    response.driver.name = results[0].name;
                    response.driver.phone = results[0].phone;
                    response.driver.internal = results[0].internal;
                    response.driver.active = results[0].active;
                    response.success = true;
                    return resolve();
                })
            })
        }

        if (! await validate_rut(rut)) response.error = 'Error. Invalid RUT';
        else {

            temp.new_rut = await format_rut(rut);
            const existing_driver = await existing_driver_query();
            
            if (!existing_driver) {
                await create_driver();
                await check_driver();    
            }
        }
    }
    catch (e) { 
        console.log(`Error creating driver. ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /create_driver -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }

})

router.post('/get_drivers', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    type = req.body.driver_type,
    response = { success: false }

    let column, status;
    if (type === 'internal') { column = type; status = 1 }
    else if (type==='external') { column = 'internal'; status = 0 }
    else if (type==='active') { column = 'active'; status = 1 }
    else if (type==='inactive') { column = 'active'; status = 0 }

    try {

        const get_drivers = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM drivers 
                    WHERE ${column}=${status} 
                    ORDER BY name ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.drivers = results;
                    return resolve();
                })
            })
        }
        await get_drivers();
        response.success = true;

    }
    catch(e) { 
        console.log(`Error getting drivers. ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /get_drivers -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/search_driver', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {driver} = req.body,
    response = { success: false }

    try {

        const search_driver = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM drivers WHERE name LIKE '%${driver}%';
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.drivers = results;
                    response.success = true;
                    return resolve();
                })
            })
        }

        await search_driver();
    }
    catch (e) { 
        console.log(`Error searching for driver. ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /search_driver -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_driver', userMiddleware.isLoggedIn, async (req,res) => {
    
    const
    { weight_id, driver_id, set_driver_as_default } = req.body,
    response = { success: false }

    try {

        const get_driver_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT name, rut FROM drivers WHERE id=${conn.escape(driver_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.driver = { 
                        id: conn.escape(driver_id), 
                        name: results[0].name, 
                        rut: results[0].rut 
                    }
                    return resolve();
                })
            })
        }

        const update_driver = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weights 
                    SET driver_id=${conn.escape(driver_id)} 
                    WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const set_default_driver = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE vehicles SET driver_id=${driver_id} 
                    WHERE primary_plates=(SELECT primary_plates 
                    FROM weights WHERE id=${parseInt(weight_id)});
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.default_update = true;
                    return resolve();
                })
            })
        }

        await get_driver_data();
        await update_driver();
        if (set_driver_as_default) await set_default_driver();
        response.success = true;

    }
    catch(e) { 
        response.error = e;
        console.log(`Error updating driver. ${e}`); 
        error_handler(`Endpoint: /update_driver -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_new_document', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id } = req.body,
    user_id  =req.userData.userId,
    now = format_date(new Date()),
    document = {
        comments: null,
        electronic: false,
        kilos: 0,
        containers: 0,
        containers_weight: 0,
        rows: [{
            container: { 
                amount: null, 
                code: null, 
                name: null, 
                weight: null 
            },
            product: { 
                code: null, 
                cut: null, 
                kilos: null, 
                informed_kilos: null, 
                last_price: { found: false }, 
                name: null, 
                price: null, 
                total: null 
            }
        }],
        total: 0,
        user: user_id
    },
    response = { success: false };

    try {

        const get_cycle = () => {
            return new Promise((resolve, reject ) => {
                conn.query(`SELECT cycle, kilos_breakdown FROM weights WHERE id=${parseInt(weight_id)};`, async (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.cycle = results[0].cycle;
                    if (results[0].kilos_breakdown === 0) response.kilos_breakdown = false;
                    else response.kilos_breakdown = true;
                    return resolve();
                })
            })
        }

        const get_internal_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name, short_name FROM internal_entities WHERE status=1;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.internal = { entities: results };
                    return resolve();
                })
            })
        }

        const get_internal_branches = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name FROM internal_branches WHERE status = 1;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.internal.branches = results;
                    response.success = true;
                    return resolve();
                })
            })
        }

        const search_username_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name FROM users WHERE id=${conn.escape(user_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    document.frozen = { user: { 
                            id: results[0].id, 
                            name: results[0].name 
                        } 
                    };
                    return resolve();
                })                 
            })
        }

        const get_internal_correlative = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT documents_header.number 
                    FROM documents_header 
                    INNER JOIN weights ON documents_header.weight_id=weights.id 
                    WHERE weights.id=(
                        SELECT weights.id
                        FROM weights 
                        INNER JOIN documents_header ON weights.id=documents_header.weight_id 
                        WHERE weights.cycle=3 AND documents_header.number IS NOT NULL
                        ORDER BY weights.id DESC LIMIT 1
                    );`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    document.number = results[0].number + 1;
                    document.date = new Date().toISOString().split('T')[0] + ' 00:00:00';
                    return resolve();
                })
            })
        }

        const check_last_recycled_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT MIN(id) AS id FROM documents_header WHERE status='R';`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results[0].id !== null) {
                        document.frozen.id = results[0].id;
                        return resolve(true);
                    }
                    return resolve(false);
                })
            })
        }

        const update_recycled_row = () => {
            return new Promise((resolve, reject) => {

                const date = (document.date === null) ? null : `'${document.date}'`;
                
                conn.query(`
                    UPDATE documents_header 
                    SET 
                        weight_id=${parseInt(weight_id)}, 
                        status='I', created='${now}', 
                        created_by=${conn.escape(user_id)},
                        sale=0,
                        number=${document.number}, 
                        date=${date}, 
                        internal_entity=${document.internal.entity.id}, 
                        internal_branch=${document.internal.branch.id}, 
                        client_entity=${document.client.entity.id}, 
                        client_branch=${document.client.branch.id} 
                    WHERE id=${document.frozen.id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    document.frozen.created = now;
                    return resolve();
                })
            })
        }

        const create_document_query = () => {
            return new Promise((resolve, reject) => {

                const date = (document.date === null) ? null : `'${document.date}'`;
                conn.query(`
                    INSERT INTO documents_header (
                        weight_id, 
                        status, 
                        created, 
                        created_by,
                        sale,
                        electronic, 
                        number, 
                        date, 
                        internal_entity, 
                        internal_branch, 
                        client_entity, 
                        client_branch) 
                    VALUES (
                        ${parseInt(weight_id)}, 
                        'I', 
                        '${now}', 
                        ${conn.escape(user_id)},
                        0,
                        0, 
                        ${document.number}, 
                        ${date}, 
                        ${document.internal.entity.id}, 
                        ${document.internal.branch.id}, 
                        ${document.client.entity.id}, 
                        ${document.client.branch.id}
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    document.frozen.id = results.insertId;
                    document.frozen.created = new Date(now).toLocaleString('es-CL');
                    return resolve();
                })
            })
        }

        //////CREATE DOCUMENT ROW
        const last_empty_row_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT MAX(id) AS id FROM documents_body WHERE status='R';`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 1 && results[0].id !== null) {
                        response.empty_row = { 
                            found: true, 
                            id: results[0].id 
                        };
                        return resolve(true)
                    }
                    return resolve(false);
                })
            })
        }

        const use_last_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_body SET status='I', document_id=${document.frozen.id} WHERE id=${response.empty_row.id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    document.rows[0].id = response.empty_row.id;
                    return resolve(true);
                })
            })
        }

        const new_row_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`INSERT INTO documents_body (status, document_id) VALUES ('I', ${document.frozen.id});`, (error, results, fields) => {
                    if (error) return reject(error);
                    document.rows[0].id = results.insertId;
                    return resolve();
                })    
            })
        }

        await get_cycle();
        
        //IF TRYING TO CREATE DOCUMENT AFTER DOING KILOS BREAKDOWN THEN RESET KILOS FIELDS TO NULL
        //KILOS BREAKDOWN HAS TO BE DONE AGAIN AFTERWARDS
        if (response.kilos_breakdown) await reset_kilos_breakdown(weight_id, response.cycle);

        await get_internal_entities();
        await get_internal_branches();
        await search_username_query();

        if (response.cycle === 3) {
            await get_internal_correlative();

            document.client = {
                entity: { id: 183, name: 'Soc. Comercial Lepefer y Cia Ltda.' },
                branch: { id: 240, name: 'Secado El Convento' }
            };
            document.internal = {
                entity: { id: 1, name: 'Soc. Comercial Lepefer y Cia Ltda.' },
				branch: { id: 1, name: 'Secado El Convento' }
            }; 
        } else {
            document.date = null;
            document.number = null;
            document.client = {
                entity: { id: null, name: null },
                branch: { id: null, name: null }
            };
            document.internal = {
                entity: { id: null, name: null },
				branch: { id: null, name: null }
            }; 
        }

        const check_empty_row = await check_last_recycled_row();
        if (check_empty_row) await update_recycled_row();
        else await create_document_query();

        const check_recycled_row = await last_empty_row_query();
        if (check_recycled_row) await use_last_row();
        else await new_row_query();

        response.document = document;
        response.success = true;
    }
    catch (e) { 
        console.log(`Error creating new document. Error msg: ${e}`); 
        response.error = e;
        error_handler(`Endpoint: /create_new_document -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/delete_document', userMiddleware.isLoggedIn, async (req, res) => {
    
    const
    {doc_id} = req.body,
    temp = {},
    response = { success: false };

    try {

        const get_weight_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.weight_id, weights.gross_brute, weights.tare_net 
                    FROM documents_header header 
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE header.id=${parseInt(doc_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    temp.weight_id = results[0].weight_id;
                    temp.gross_brute = 1 * results[0].gross_brute;
                    temp.tare_net = 1 * results[0].tare_net;
                    return resolve();
                })
            })
        }

        const delete_document = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_header SET status='N' WHERE id=${parseInt(doc_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const get_containers_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(documents_body.container_weight * documents_body.container_amount) AS containers_weight 
                    FROM documents_body 
                    INNER JOIN documents_header ON documents_body.document_id=documents_header.id 
                    WHERE (documents_body.status='T' OR documents_body.status='I') AND 
                    (documents_header.status='T' OR documents_header.status='I') AND 
                    documents_header.weight_id=${temp.weight_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    temp.gross_containers = 1 * results[0].containers_weight;
                    return resolve();
                })
            })
        }

        const update_containers_weight = () => {
            return new Promise((resolve, reject) => {

                const 
                gross_net = (1 * temp.gross_brute === 0) ? null : temp.gross_brute - temp.gross_containers,
                final_net_weight = (1 * gross_net === 0 || 1 * temp.tare_net === 0) ? null : gross_net - (1 * temp.tare_net);

                conn.query(`
                    UPDATE weights 
                    SET 
                        gross_containers=${temp.gross_containers},
                        gross_net=${gross_net},
                        final_net_weight=${final_net_weight}
                    WHERE id=${temp.weight_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT gross_containers, gross_net, final_net_weight FROM weights WHERE id=${temp.weight_id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.gross_containers = results[0].gross_containers;
                    response.gross_net = results[0].gross_net;
                    response.final_net_weight = results[0].final_net_weight;
                    return resolve();
                })
            })
        }

        await get_weight_data();
        await delete_document();
        await get_containers_weight();

        await update_containers_weight();
        await check_update();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting document. ${e}`);
        error_handler(`Endpoint: /delete_document -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/change_doc_type', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { doc_id } = req.body,
    type = (req.body.type === false) ? 0 : 1,
    response = { success: false }

    try {

        const change_doc_sale = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET sale=${parseInt(type)} WHERE id=${parseInt(doc_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await change_doc_sale()
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error changing document sale status. ${e}`);
        error_handler(`Endpoint: /change_doc_type -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

/////////// DOESNT GET CALLED ONCE IN CLIENT SIDE!!!!!!!!!!!!!!!!!!!!!!!
router.post('/get_document', async (req, res) => {

    const
    {doc_id} = req.body,
    response = { success: false };

    try {

        const user_name = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM users WHERE id=${response.user.id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.user.name = results[0].name;
                    return resolve();
                })
            })
        }

        const client_entity_name = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM entities WHERE id=${response.client.entity.id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].name);
                })
            })
        }

        const client_branch_name = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM entity_branches WHERE id=${response.client.branch.id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.client.branch.name = results[0].name;
                })
            })
        }

        const internal_entity_name = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM internal_entities WHERE id=${response.internal.entity.id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.internal.entity.name = results[0].name;
                    return resolve();
                })
            })
        }

        const internal_branch_name = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM internal_branches WHERE id=${response.internal.branch.id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.internal.branch.name = results[0].name;
                    return resolve();
                })
            })
        }

        const sum_totals = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT SUM(informed_kilos) AS kilos, SUM(container_amount) AS containers FROM documents_body WHERE document_id=${parseInt(doc_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve([results[0].kilos, results[0].containers]);
                })
            })
        }

        const header_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT * FROM documents_header WHERE id=${doc_id};`, async (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 1) {

                        const data = results[0];
                        response.rows = [];

                        response.id = data.id;
                        response.created = data.created.toLocaleString('es-CL');
                        response.user = { id: data.created_by }
                        response.user.name = await user_name();
                        response.number = data.number;

                        response.date = (response.date === null) ? null : data.date.toLocaleString('es-CL').split(' ')[0];

                        response.client = { entity: { id: data.client_entity } }
                        if (response.client.entity.id===null) response.client.entity.name = null;
                        else response.client.entity.name = await client_entity_name();

                        response.client.branch = { id: data.client_branch }
                        if (response.client.branch.id===null) response.client.branch.name = null;
                        else response.client.branch.name = await client_branch_name();
                        
                        response.internal = { entity: { id: data.internal_entity } }
                        if (response.internal.entity.id===null) response.internal.entity.name = null;
                        else response.internal.entity.name = await internal_entity_name();
                        
                        response.internal.branch = { id: data.internal_branch }
                        if (response.internal.branch.id===null) response.internal.branch.name = null;
                        else response.internal.branch.name = await internal_branch_name();

                        const totals = await sum_totals();
                        response.kilos = totals[0];
                        response.containers = totals[1];
                        response.total = data.document_total;
                        return resolve(true);    
                    }
                    return resolve(false);
                })
            })
        }

        const get_product_name = (code) => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM products WHERE code='${code}';`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].name);
                })
            })
        }

        const get_container_name = (code) => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT name FROM containers WHERE code='${code}';`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].name);
                })
            })
        }

        const body_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT * FROM documents_body WHERE document_id=${doc_id};`, async (error, results, fields) => {
                    if (error) return reject(error);
                    const data = results;
                    for (let i = 0; i < data.length; i++) {
                        const row = {};
                        row.id = data[i].id;
                        row.document_id = response.id;
                        row.product = { code: data[i].product_code, cut: data[i].cut, kilos: data[i].informed_kilos, price: data[i].price, total: data[i].product_total}
                        row.product.name = await get_product_name(row.product.code);
                        row.container = { code: data[i].container_code, weight: data[i].container_weight, amount: data[i].container_amount }
                        row.container.name = await get_container_name(row.container.code);
                        response.rows.push(row);
                    }
                    return resolve();
                })
            })
        }

        await header_data();
        await body_data();
    }
    catch (e) { 
        response.error = e;
        console.log(`Error getting document. ${e}`); 
        error_handler(`Endpoint: /get_document -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/recycle_row', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id } = req.body,
    response = { success: false }

    try {

        const recycle_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_body SET status='R' WHERE id=${parseInt(row_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await recycle_row();
        response.success = true;
    }
    catch (e) { 
        response.error = e;
        console.log(`Error Recycling row. ${e}`); 
        error_handler(`Endpoint: /recycle_row -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_doc_status', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { doc_id } = req.body,
    response = { success: false, update_doc: false, update_rows: false }

    try {

        const document_header_with_content = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT number, date, internal_entity, internal_branch, client_entity, client_branch, document_total 
                    FROM documents_header WHERE id=${parseInt(doc_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    const data = results[0];
                    if (
                        data.number===null && data.date===null && data.internal_entity===null && data.internal_branch===null && 
                        data.client_entity===null && data.client_branch===null && data.document_total===null
                    ) return resolve(true);
                    return resolve(false);
                })
            })
        }

        const update_rows_status = (id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_body 
                    SET 
                        status='R', 
                        product_code=NULL, 
                        price=NULL, 
                        kilos=NULL, 
                        informed_kilos=NULL, 
                        product_total=NULL, 
                        container_code=NULL, 
                        container_weight=NULL, 
                        container_amount=NULL 
                    WHERE id=${id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const document_body_with_content = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, product_code, price, informed_kilos, product_total, container_code, container_amount, container_weight 
                    FROM documents_body WHERE document_id=${parseInt(doc_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);

                    let with_content = false;

                    for (let i = 0; i < results.length; i++) {
                        if (results[i].product_code === null && results[i].product_total === null && results[i].container_amount === null) {
                            update_rows_status(results[i].id);
                        } else {
                            if (!with_content) with_content = true;
                        }
                    }
                    return resolve(with_content);
                })
            })
        }

        const update_document_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_header SET status='R' WHERE id=${parseInt(doc_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.update_doc = true;
                    return resolve();
                })
            })
        }
    
        const documents_header_null = await document_header_with_content();
        if (documents_header_null) {
            const documents_body_with_content = await document_body_with_content();
            if (!documents_body_with_content) await update_document_status();
        }

        response.success = true;
    }
    catch (e) { 
        response.error = e;
        console.log(`Error updating document status. ${e}`); 
        error_handler(`Endpoint: /update_doc_status -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.get('/get_internal_entities', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false }

    try {
        const get_internal_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name, short_name FROM internal_entities WHERE status=1;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }

        const get_internal_branches = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, name FROM internal_branches WHERE status = 1;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.branches = results;
                    response.success = true;
                    return resolve();
                })
            })
        }

        await get_internal_entities();
        await get_internal_branches();
    }
    catch (e) { 
        response.error = e;
        console.log(`Error fetching internal entities. Error msg ${e}`); 
        error_handler(`Endpoint: /get_internal_entities -> User Name: ${req.userData.userName}\r\n${e}`);

    }
    finally { res.json(response) }
})

router.post('/update_document_electronic_status', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { doc_id } = req.body,
    new_electronic_status = (req.body.new_electronic_status) ? 1 : 0,
    response = { success: false }

    try {

        const update_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header
                    SET electronic=${new_electronic_status}
                    WHERE id=${parseInt(doc_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }
        
        await update_status();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error fetching internal entities. Error msg ${e}`); 
        error_handler(`Endpoint: /update_document_electronic_status -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_doc_number', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { doc_id } = req.body,
    doc_number = (req.body.doc_number === '') ? null : parseInt(req.body.doc_number),
    response = { success: false, existing_document: false }

    try {

        const check_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.cycle 
                    FROM weights 
                    INNER JOIN documents_header ON weights.id=documents_header.weight_id 
                    WHERE documents_header.id=${doc_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(parseInt(results[0].cycle));
                })
            })
        }

        const check_doc_entity = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT ${field}_entity AS entity FROM documents_header WHERE id=${parseInt(doc_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].entity);
                })
            })
        }

        const check_doc_number = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id 
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE header.${field}_entity=${doc_entity} AND header.number=${doc_number}
                    AND header.id <> ${parseInt(doc_id)} AND weights.status <> 'N'
                    AND (header.status='T' OR header.status='I');
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) response.existing_document = true;
                    return resolve();
                })
            })
        }

        const reset_doc_number = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET number=NULL WHERE id=${parseInt(doc_id)}    
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.doc_number = null;
                    return resolve();
                })
            })
        }

        const update_doc_number = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header 
                    SET number=${doc_number} 
                    WHERE id=${parseInt(doc_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.doc_number = doc_number;
                    return resolve();
                })
            })
        }

        const 
        cycle = await check_cycle(),
        field = (cycle === 1) ? 'client' : 'internal';

        const doc_entity = await check_doc_entity();

        if (doc_entity !== null) await check_doc_number();
        
        if (response.existing_document) await reset_doc_number();
        else await update_doc_number();
        
        response.success = true;

    }
    catch(e) { 
        response.error = e;
        console.log(`Error updating document number. Error msg: ${e}`); 
        error_handler(`Endpoint: /update_doc_number -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_doc_date', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { doc_id } = req.body,
    doc_date = (req.body.doc_date === '') ? null : `'${req.body.doc_date}'`,
    response = { success: false }
    
    try {
        const update_doc_date = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET date=${doc_date} WHERE id=${doc_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        if (!validate_date(req.body.doc_date)) throw 'Fecha para documento inválida';
        await update_doc_date();
        response.success = true;

    }
    catch(e) { 
        response.error = e;
        console.log(`Error updating document date. Error msg: ${e}`); 
        error_handler(`Endpoint: /update_doc_date -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_new_document_row', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { document_id } = req.body,
    row = {
        product: { 
            code: null, 
            cut: null, 
            name: null, 
            price: null, 
            kilos: null, 
            informed_kilos: null, 
            total: null, 
            last_price: { 
                found: false, 
                price: null 
            }
        },
        container: { 
            code: null, 
            name: null, 
            weight: null, 
            amount: null 
        }
    },
    response = { 
        success: false, 
        empty_row: { 
            found: false 
        } 
    };

    try {
        
        const last_empty_row_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT MAX(id) AS id FROM documents_body WHERE status='R';`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 1 && results[0].id !== null) {
                        response.empty_row.found = true;
                        response.empty_row.id = results[0].id;
                        return resolve(true)
                    } else return resolve(false);
                })
            })
        }

        const use_last_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_body SET status='I', document_id=${document_id} WHERE id=${response.empty_row.id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    row.id = response.empty_row.id;
                    return resolve();
                })
            })
        }

        const new_row_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`INSERT INTO documents_body (status, document_id) VALUES ('I', ${document_id});`, (error, results, fields) => {
                    if (error) return reject(error);
                    row.id = results.insertId;
                    return resolve();
                })    
            })
        }

        const empty_row = await last_empty_row_query();
        if (empty_row) await use_last_row(); 
        else await new_row_query();
        response.row = row;
        response.success = true;    
        
    }
    catch (e) { 
        response.error = e;
        console.log(`Error creating new row. Error msg: ${e}`); 
        error_handler(`Endpoint: /create_new_document_row -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.get('/get_entities_for_document', userMiddleware.isLoggedIn, async (req, res) => {
    
    const response = { success: false }
    try {

        const get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query("SELECT * FROM entities WHERE status=1 AND type='P' ORDER BY name ASC;", (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results); 
                });                        
            })
        }

        response.entities = await get_entities();
        response.success = true;
    }
    catch (e) {
        response.error = e;
        console.log(`Error fetching entities. ${e}`); 
        error_handler(`Endpoint: /get_entities_for_document -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/search_for_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity_to_search } = req.body,
    response = { success: false }

    try {
        const search_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, rut, name FROM entities WHERE name LIKE '%${entity_to_search}%' ORDER BY name ASC;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })        
            })
        }
        await search_query();
        response.success = true;

    }
    catch (e) {
        response.error = e;
        console.log(`Error searching for entity ${entity_to_search}. Error msg: ${e}`); 
        error_handler(`Endpoint: /search_for_entity -> User Name: ${req.userData.userName}\r\n${e}`);

    }
    finally { res.json(response) }
})

router.post('/update_client_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    entity_id = req.body.client_id,
    { document_id } = req.body,
    response = { 
        success: false, 
        last_record: { found: false }, 
        existing_document: true 
    };

    try {

        const get_weight_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.cycle 
                    FROM weights 
                    INNER JOIN documents_header ON weights.id = documents_header.weight_id 
                    WHERE documents_header.id=${parseInt(document_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].cycle);
                })
            })
        }
        
        const entity_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT name FROM entities WHERE id=${conn.escape(entity_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) { return reject(error) }
                    response.entity = { 
                        id: entity_id, 
                        name: results[0].name 
                    }
                    return resolve();
                })
            })
        }

        const update_query = () => {
            return new Promise(async (resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET client_entity=${conn.escape(entity_id)} WHERE id=${document_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const branches_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entity_branches.id, entity_branches.name, entity_branches.address, comunas.comuna 
                    FROM entity_branches INNER JOIN comunas ON entity_branches.comuna=comunas.id 
                    WHERE entity_branches.entity_id=${conn.escape(entity_id)} ORDER BY entity_branches.name;
                `,
                (error, results, fields) => {
                    if (error) return reject(error);
                    response.branches = results;
                    return resolve();
                })
            })
        }

        const last_record_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT documents_header.weight_id AS pesaje, internal_entities.id AS entity_id, internal_entities.name AS entity_name, 
                    internal_branches.id AS branch_id, internal_branches.name AS branch_name 
                    FROM documents_header INNER JOIN internal_entities ON documents_header.internal_entity=internal_entities.id 
                    INNER JOIN internal_branches ON documents_header.internal_branch=internal_branches.id 
                    INNER JOIN weights ON documents_header.weight_id=weights.id 
                    WHERE weights.cycle=${parseInt(cycle)} AND documents_header.client_entity=${parseInt(entity_id)} 
                    ORDER BY documents_header.weight_id DESC LIMIT 1;
                `, (error, results, fields) => {

                    if (error) { return reject(error) }
                    if (results.length > 0) {
                        response.last_record.found = true;
                        response.last_record.weight = results[0].pesaje;
                        response.last_record.entity = { 
                            id: results[0].entity_id, 
                            name: results[0].entity_name 
                        };
                        response.last_record.branch = { 
                            id: results[0].branch_id, 
                            name: results[0].branch_name 
                        };
                    }
                    return resolve();
                })
            })
        }

        const cycle = await get_weight_cycle();
        await entity_query();
        await update_query();
        await branches_query();
        await last_record_query();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error setting entity. Error msg: ${e}`);
        error_handler(`Endpoint: /update_client_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/document_update_branch', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { branch_id, document_id } = req.body,
    doc_number = (req.body.doc_number === null || req.body.doc_number === '') ? null : parseInt(req.body.doc_number),
    current_doc_electronic_status = (req.body.document_electronic) ? 1 : 0,
    temp = { last_document_electronic_status: false },
    response = { 
        success: false, 
        existing_document: false 
    }

    try {    
 
        const check_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.cycle 
                    FROM weights 
                    INNER JOIN documents_header ON weights.id=documents_header.weight_id 
                    WHERE documents_header.id=${document_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(parseInt(results[0].cycle));
                })
            })
        }

        const branch_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entity_id, name 
                    FROM entity_branches 
                    WHERE id=${conn.escape(branch_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) { return resolve(error) }
                    response.entity_id = results[0].entity_id;
                    response.branch_id = branch_id;
                    response.branch_name = results[0].name;
                    return resolve(true);
                })
            })
        }

        const check_doc_number = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id 
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE header.${field}_entity=${response.entity_id} AND header.number=${doc_number} 
                    AND header.id <> ${parseInt(document_id)} AND weights.status <> 'N'
                    AND (header.status='T' OR header.status='I');
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) response.existing_document = true;
                    return resolve();
                })
            })
        }

        const reset_doc_number = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header 
                    SET number=NULL WHERE id=${parseInt(document_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const update_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header 
                    SET client_branch=${conn.escape(branch_id)} 
                    WHERE id=${parseInt(document_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(true);
                })
            })
        }

        const check_last_document_electronic_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.electronic
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE header.client_entity=${response.entity_id}
                    AND (header.status='T' OR header.status='I') AND weights.status='T' AND weights.cycle=${cycle}
                    ORDER BY header.id DESC LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) temp.last_document_electronic_status = results[0].electronic;
                    return resolve();
                })
            })
        }

        const update_document_electronic_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET electronic=${temp.last_document_electronic_status} WHERE id=${parseInt(document_id)};
                `, (error, results, fields) => {;
                    if (error) return reject(error);
                    response.last_document_electronic = (temp.last_document_electronic_status === 0) ? false : true;
                    return resolve();
                })
            })
        }

        const 
        cycle = await check_cycle(),
        field = (cycle === 1) ? 'client' : 'internal';

        await branch_query();

        if (doc_number !== null) await check_doc_number();

        //if (response.existing_document) await reset_doc_number();
        await update_query();

        //CHECK ENTITY LAST DOCUMENT ELECTRONIC STATUS AND MATCH NEW DOCUMENT
        await check_last_document_electronic_status();

        //CHANGE STATUS ELECTRONIC STATUS IF ITS DIFFERENT
        if (current_doc_electronic_status === temp.last_document_electronic_status) 
            response.last_document_electronic = temp.last_document_electronic_status;
        else 
            await update_document_electronic_status();

        response.success = true;

    }
    catch (e) { 
        response.error = e;
        console.log(`Eror updating client branch. Error msg: ${e}`); 
        error_handler(`Endpoint: /document_update_branch -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/document_select_internal', userMiddleware.isLoggedIn, async (req, res) => {

    const
    target_id = req.body.target_id,
    target_table = req.body.target_table.replace('-', '_'),
    doc_id = req.body.document_id,
    response = { success: false };

    try {

        const check_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                SELECT weights.cycle 
                FROM weights 
                INNER JOIN documents_header ON weights.id=documents_header.weight_id 
                WHERE documents_header.id=${doc_id};
            `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(parseInt(results[0].cycle));
                })
            })
        }

        const check_doc_number = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT number FROM documents_header WHERE id=${doc_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].number);
                })
            })
        }

        const check_existing_doc = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT MAX(id) AS id 
                    FROM documents_header 
                    WHERE internal_entity=${target_id} AND number=${doc_number};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0 && results[0].id !== null) response.existing_document = true;
                    return resolve();
                })
            })
        }

        const set_doc_number_to_null = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET number=NULL WHERE id=${doc_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const internal_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, name FROM ${target_table} WHERE id=${target_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.id = results[0].id;
                    response.name = results[0].name
                    return resolve();
                });                        
            })
        }

        const internal_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET internal_${field}=${target_id} WHERE id=${doc_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        let field;
        if (target_table === 'internal_entities') { response.target = 'entities'; field = 'entity'; }
        else { response.target = 'branches'; field = 'branch'; }
        
        
        /* CHECKS IF DOCUMENT CURRENTLY EXISTS -> DISABLED IT BECAUSE ALREADY DOES IT WHEN UPDATING THE BRANCH
        const cycle = await check_cycle();
        const doc_number = await check_doc_number();
        if (cycle===2 && doc_number !== null && target_table==='internal_entities') await check_existing_doc();
        if (response.existing_document) await set_doc_number_to_null();
        */

        await internal_query();
        await internal_update();

        response.success = true;
    }
    catch (e) { 
        response.error = e;
        console.log(`Error fetching internal data. Error msg: ${e}`); 
        error_handler(`Endpoint: /document_select_internal -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.get('/new_entity_data', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false }

    try {

        const get_regiones = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, region FROM regiones ORDER BY id ASC;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.regiones = results;
                    return resolve();
                })    
            })
        }

        response.giros = await get_giros();
        await get_regiones();
        response.success = true;
    }
    catch (e) { 
        response.error = e;
        console.log(`Error getting giros and regiones. ${e}`); 
        error_handler(`Endpoint: /new_entity_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/fetch_comunas', userMiddleware.isLoggedIn, async (req, res) => {

    const
    region = req.body.selected_region,
    response = { success: false }

    try {

        const get_comunas = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, comuna FROM comunas WHERE region_id=${conn.escape(region)} ORDER BY comuna ASC;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.comunas = results;
                    return resolve();
                })
            })
        }

        await get_comunas();
        response.success = true;
    }
    catch (e) { 
        response.error = e;
        console.log(`Error getting comunas. ${e}`); 
        error_handler(`Endpoint: /fetch_comunas -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/search_product_by_name', userMiddleware.isLoggedIn, async (req, res) => {
    const
    { product } = req.body,
    response = { success: false }

    try {
        const get_products = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, code, name, type, image FROM products WHERE name LIKE '%${product}%' ORDER BY name ASC;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.products = results;
                    return resolve();
                });        
            })
        }
        await get_products();
        response.success = true;
    }
    catch(e) { 
        response.error = e;
        console.log(`Error searching product by name. Error msg: ${e}`); 
        error_handler(`Endpoint: /search_product_by_name -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_product', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id, entity_id } = req.body,
    code = (req.body.code.length === 0) ? null : `${req.body.code}`,
    response = { 
        found: false, 
        code: null, 
        name: null, 
        last_price: { 
            found: false, price: null 
        }, 
        success: false 
    };

    try {

        const search_product_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT id, code, name FROM products WHERE code=${conn.escape(code)};`, (error, results, fields) => {
                    if (error) { return reject(error) }
                    if (results.length > 0) {
                        response.found = true;
                        response.id = results[0].id;
                        response.code = results[0].code;
                        response.name = results[0].name;
                    }
                    return resolve();
                });
            });
        }

        const last_price_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT body.price 
                    FROM documents_body AS body 
                    INNER JOIN documents_header AS header ON body.document_id=header.id 
                    WHERE body.id=(
                        SELECT MAX(body.id) FROM documents_body AS body 
                        INNER JOIN documents_header AS header ON body.document_id=header.id 
                        WHERE header.client_entity=${entity_id} AND body.product_code=${conn.escape(code)} AND body.status='T'
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.last_price.found = true;
                        response.last_price.price = results[0].price;  
                    }
                    return resolve();
                })
            })
        }

        const update_product_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_body SET product_code=${conn.escape(code)} WHERE id=${row_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }
        
        if (code !== null) {
            await search_product_query();
            if (response.found) {
                if (entity_id !== '') await last_price_query();
            }    
        } else {

        }
        
        await update_product_query();
        response.success = true;
    }
    catch (e) { 
        response.error = e; 
        console.log(`Error updating product. ${e}`);
        error_handler(`Endpoint: /update_product -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally {  res.json(response) }
})

router.post('/get_traslado_description', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id } = req.body,
    response = { success: false }

    try {

        const get_description = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT description FROM traslados WHERE documents_body_id=${parseInt(row_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.description = results[0].description;
                    return resolve();
                })
            })
        }

        await get_description();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting traslado description. ${e}`);
        error_handler(`Endpoint: /get_traslado_description -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_traslado_description', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id, description } = req.body,
    response = { success: false }

    try {

        const check_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM traslados WHERE documents_body_id=${parseInt(row_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(true);
                    return resolve(false);
                })
            })
        }

        const update_description = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE traslados 
                    SET description=${conn.escape(description)} 
                    WHERE documents_body_id=${parseInt(row_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const insert_description = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO traslados (documents_body_id, description)
                    VALUES(
                        ${parseInt(row_id)},
                        ${conn.escape(description)}
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_row_id = await check_row();
        if (check_row_id) await insert_description();
        else await update_description();

        response.success = true
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error updating traslado description. ${e}`);
        error_handler(`Endpoint: /update_traslado_description -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_cut', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id, cut } = req.body,
    response = { success: false };

    try {

        const update_cut = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_body SET cut=${conn.escape(cut)} WHERE id=${row_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT cut FROM documents_body WHERE id=${row_id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.cut = results[0].cut;
                    return resolve();
                })
            })
        }

        await update_cut();
        await check_update();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error updating cut type. ${e}`);
        error_handler(`Endpoint: /update_cut -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/update_price', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id } = req.body,
    price = (req.body.price === '') ? null : parseInt(req.body.price),
    temp = {},
    response = { success: false, product_total: 0, doc_total: 0 }

    try {

        const get_doc_and_weight_id = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT documents_header.id, weights.cycle 
                    FROM documents_header 
                    INNER JOIN documents_body ON documents_header.id=documents_body.document_id 
                    INNER JOIN weights ON documents_header.weight_id=weights.id 
                    WHERE documents_body.id=${row_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    temp.doc_id = results[0].id;
                    temp.cycle = results[0].cycle;
                    return resolve();
                })
            })
        } 

        const check_for_total = () => {
            return new Promise((resolve, reject) => {

                const field = (temp.cycle === 1) ? 'informed_kilos' : 'kilos';
                conn.query(`SELECT ${field} AS kilos FROM documents_body WHERE id=${row_id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    if (results[0].kilos !== null && price !== null) response.product_total = parseInt(price * results[0].kilos);
                    return resolve();
                })
            })
        }

        const update_price = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_body SET price=${price}, product_total=${response.product_total} WHERE id=${row_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.price = price;
                    return resolve();
                })    
            })
        }

        const calculate_new_doc_total = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT SUM(product_total) AS total FROM documents_body WHERE document_id=${temp.doc_id} AND (status='I' OR status='T');`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.doc_total = 1 * results[0].total;
                    return resolve();
                })
            })
        }

        const update_new_doc_total = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_header SET document_total=${response.doc_total} WHERE id=${temp.doc_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.doc_total.update = true;
                    return resolve();
                })
            })
        }

        await get_doc_and_weight_id();
        await check_for_total();
        await update_price();
        await calculate_new_doc_total();
        await update_new_doc_total();
        response.success = true;
    }
    catch (e) { 
        response.error = e; 
        console.log(`Error updating product price. Error msg: ${e}`);
        error_handler(`Endpoint: /update_price -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_kilos', userMiddleware.isLoggedIn, async (req,res) => {

    const
    {row_id} = req.body,
    kilos = (req.body.kilos === '') ? null : parseFloat(req.body.kilos),
    temp = {},
    response = { success: false, product_total: null, doc_total: 0 }

    try {

        const get_doc_and_weight_id = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id, weights.cycle 
                    FROM documents_body body 
                    INNER JOIN documents_header header ON header.id=body.document_id 
                    INNER JOIN weights ON header.weight_id=weights.id 
                    WHERE body.id=${row_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    temp.doc_id = results[0].id;
                    temp.cycle = results[0].cycle;
                    return resolve();
                })
            })
        } 

        const check_for_total = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT price FROM documents_body WHERE id=${row_id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.product_total = parseInt(1 * kilos * results[0].price);
                    return resolve();
                })
            })
        }

        const update_kilos = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_body 
                    SET 
                        ${field}=${kilos}, 
                        product_total=${response.product_total} 
                    WHERE id=${row_id};
                `, (error, results, fields) => {
                    if (error) { return reject(error) }
                    response.kilos = kilos;
                    return resolve();
                })
            })
        }

        const get_document_totals = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(${field}) AS doc_kilos, SUM(product_total) AS doc_total 
                    FROM documents_body WHERE document_id=${temp.doc_id} AND (status='I' OR status='T');
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.doc_kilos = 1 * results[0].doc_kilos;
                    response.doc_total = 1 * results[0].doc_total
                    return resolve();
                })
            })
        }

        const update_new_doc_total = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_header SET document_total=${response.doc_total} WHERE id=${temp.doc_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.doc_total.update = true;
                    return resolve();
                })
            })
        }

        await get_doc_and_weight_id();

        const field = (temp.cycle === 1) ? 'informed_kilos' : 'kilos';

        await check_for_total();
        await update_kilos();
        await get_document_totals();
        await update_new_doc_total();
        response.success = true;
        
    }
    catch (e) { 
        response.error = e;
        console.log(`Error updating kilos. Error msg: ${e}`); 
        error_handler(`Endpoint: /update_kilos -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_container', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id } = req.body,
    code = (req.body.code === '') ? null : `${req.body.code}`,
    response = { 
        success: false, 
        found: false, 
        container: { 
            code: null, name: null, weight:null 
        }
    };

    try {

        const search_query = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT code, name, weight FROM containers WHERE code=${conn.escape(code)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
 
                    response.found = true;
                    response.container = results[0];    
                    return resolve();
                
                })
            })
        }

        const update_documents_body = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_body 
                    SET container_code=${conn.escape(code)}, container_weight=${response.container.weight} 
                    WHERE id=${parseInt(row_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(true);
                })
            })
        }

        const sum_document_containers_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT 
                    SUM(container_weight * container_amount) AS document_containers_weight, 
                    SUM(container_amount) AS document_containers_amount 
                    FROM documents_body 
                    WHERE document_id=(
                        SELECT document_id FROM documents_body WHERE id=${parseInt(row_id)}
                    );
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.document = { 
                        containers_weight: 1 * results[0].document_containers_weight
                    };
                    return resolve();
                })
            })
        }
        
        if (code !== null) await search_query();
        
        await update_documents_body();
        await sum_document_containers_weight();

        response.success = true;
    }
    catch (e) { 
        response.error = e; 
        console.log(`Error updating container. Error msg: ${e}`);
        error_handler(`Endpoint: /update_container -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response); }
});

router.post('/search_container_by_name', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { container } = req.body,
    response = { success: false }

    try {

        const search_container = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT code, name, weight FROM containers WHERE name LIKE '%${container}%';
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.containers = results;
                    response.success = true;
                    return resolve();
                })
            })
        }
        
        await search_container();
    }
    catch (e) { 
        response.error = e;
        console.log(`Error searching for container. ${e}`); 
        error_handler(`Endpoint: /search_container_by_name -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/update_container_amount', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id } = req.body,
    amount = (req.body.amount === '') ? null : parseInt(req.body.amount),
    response = { success: false };
    try {

        const update_documents_body = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_body SET status='T', container_amount=${amount} WHERE id=${row_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.container_amount = amount;
                    return resolve();
                })
            })
        }

        const sum_document_containers = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT 
                        SUM(container_weight * container_amount) AS document_containers_weight, 
                        SUM(container_amount) AS document_containers_amount 
                    FROM documents_body
                    WHERE (status='T' OR status='I') AND 
                    document_id=(
                        SELECT document_id FROM documents_body WHERE id=${row_id}
                    );
                `, (error, results, fields) => {
                    if (error ||results.length === 0) return reject(error);
                    response.document = { 
                        containers_weight: 1 * results[0].document_containers_weight,
                        containers_amount: 1 * results[0].document_containers_amount
                    };
                    return resolve();
                })
            })
        }

        await update_documents_body();
        await sum_document_containers();

        response.success = true;
    }
    catch(e) { 
        response.error = e;
        console.log(`Error updating container amount. Error msg: ${e}`); 
        error_handler(`Endpoint: /update_container_amount -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/annul_row', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id } = req.body,
    response = { success: false, last_row: false, single_row: true }

    try {

        const get_doc_id = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT document_id FROM documents_body WHERE id=${parseInt(row_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error)
                    return resolve(results[0].document_id);
                })
            })
        }

        const check_single_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT COUNT(id) AS total 
                    FROM documents_body 
                    WHERE document_id=${parseInt(doc_id)} AND (status='I' OR status='T');
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    if (results[0].total > 1) response.single_row = false;
                    console.log(response)
                    return resolve();
                })
            })
        }

        //IF ITS LAST ROW AND EVERTYTHING IS EMPTY THEN IT SHOULD BE RECICLED
        const check_last_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT MAX(id) AS id 
                    FROM documents_body 
                    WHERE document_id=${parseInt(doc_id)} AND product_code IS NULL AND cut IS NULL AND
                    price IS NULL AND kilos IS NULL AND informed_kilos IS NULL AND product_total IS NULL AND
                    container_code IS NULL AND container_weight IS NULL AND container_amount IS NULL 
                    AND status <> 'N';
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    if (parseInt(row_id) === results[0].id) response.last_row = true;
                    return resolve();
                })
            })
        }
   
        const annul_row = () => {
            return new Promise((resolve, reject) => {

                let query;
                if (response.single_row)
                    query = `
                        UPDATE documents_body 
                        SET 
                            status='I', 
                            product_code=NULL, 
                            cut=NULL, 
                            price=NULL, 
                            kilos=NULL,
                            informed_kilos=NULL, 
                            product_total=NULL, 
                            container_code=NULL, 
                            container_amount=NULL, 
                            container_weight=NULL 
                        WHERE id=${parseInt(row_id)};`
                    ;
                else {
                    //IF ITS LAST ROW THEN EVERYTHING IS ALREADY EMPTY SO IT GETS RECYCLED. ELSE STATUS IS NULL
                    const status = (response.last_row) ? 'R' : 'N';
                    query = `UPDATE documents_body SET status='${status}' WHERE id=${parseInt(row_id)};`;
                }
                conn.query(query, (error, results, fields) => {
                    if (error) return reject();
                    return resolve();
                })
            })
        }

        const doc_id = await get_doc_id();
        await check_single_row();
        await check_last_row();
        await annul_row();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error annulling row. Error msg: ${e}`);
        error_handler(`Endpoint: /annul_row -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

router.post('/annul_document', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {doc_id} = req.body,
    temp = {},
    response = { success: false };

    try {

        const get_weight_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.id, weights.gross_brute, weights.tare_net
                    FROM documents_header header 
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE header.id=${doc_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    temp.weight_id = results[0].id;
                    temp.gross_brute = results[0].gross_brute;
                    temp.tare_net = results[0].tare_net;
                    return resolve();
                })
            })
        }

        const annul_from_header = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_header SET status='N' WHERE id=${doc_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.header = true;
                    return resolve();
                })
            })
        }

        const get_containers_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(body.container_weight * body.container_amount) AS weight
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    WHERE header.weight_id=${temp.weight_id} AND (header.status='T' OR header.status='I')
                    AND (body.status='T' OR body.status='I');
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(1 * results[0].weight);
                })
            })
        }

        const update_weights_table = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weights
                    SET 
                        gross_containers=${response.containers_weight},
                        gross_net=${response.gross_net},
                        final_net_weight=${response.final_net_weight}
                    WHERE id=${temp.weight_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }
    
        await get_weight_data();
        await annul_from_header();

        //REDO WEIGHTS KILOS
        response.containers_weight = await get_containers_weight();
        response.gross_net = (temp.gross_brute === 0) ? 0 : (1 * temp.gross_brute) - response.containers_weight;
        response.final_net_weight = (response.gross_net - temp.tare_net < 0) ? 0 : response.gross_net - temp.tare_net;
        await update_weights_table();

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error annulling document. ${e}`);
        error_handler(`Endpoint: /annul_document -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_document_comments', userMiddleware.isLoggedIn, async (req, res) => {
    
    const
    { comments, doc_id } = req.body,
    response = { success: false, comment_row: false }

    try {

        const check_comment = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT comments FROM documents_comments WHERE doc_id=${doc_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.comment_row = true;
                        return resolve(true);
                    }
                    return resolve(false);
                })
            })
        }

        const update_comment = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE documents_comments SET comments=${conn.escape(comments)} WHERE doc_id=${doc_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const insert_comments = () => {
            return new Promise((resolve, reject) => {
                conn.query(`INSERT INTO documents_comments (doc_id, comments) VALUES (${doc_id}, ${conn.escape(comments)});`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await check_comment();
        if (response.comment_row) await update_comment();
        else await insert_comments();
        response.success = true;
    }
    catch (e) { 
        response.error = e;
        console.log(`Error saving document comments. ${e}`); 
        error_handler(`Endpoint: /update_document_comments -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_weight_totals', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id } = req.body,
    response = { success: false }

    try {

        const get_weight_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT cycle from weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.cycle = results[0].cycle;
                    return resolve();
                })
            })
        }

        const get_informed_kilos = () => {
            return new Promise((resolve, reject) => {

                const field = (response.cycle === 1) ? 'informed_kilos' : 'kilos';
                conn.query(`
                    SELECT SUM(documents_body.${field}) AS kilos 
                    FROM documents_body 
                    INNER JOIN documents_header ON documents_body.document_id = documents_header.id 
                    WHERE (documents_header.status='I' OR documents_header.status='T') 
                    AND (documents_body.status='T' OR documents_body.status='I')
                    AND documents_header.weight_id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.kilos = 1 * results[0].kilos;
                    return resolve();
                })
            })
        }

        const get_weight_totals = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT gross_containers, gross_net, final_net_weight FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.gross_containers = 1 * results[0].gross_containers;
                    response.gross_net = 1 * results[0].gross_net;
                    response.final_net_weight = 1 * results[0].final_net_weight;
                    return resolve();
                })
            })
        }

        await get_weight_cycle();
        await get_informed_kilos();
        await get_weight_totals();

        response.success = true;
    }
    catch(e) { 
        response.error = e;
        console.log(`Error getting document totals. ${e}`); 
        error_handler(`Endpoint: /get_weight_totals -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_empty_containers_line', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id } = req.body,
    temp = {},
    response = { success: false }

    try {

        const check_kilos_breakdown = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT cycle, kilos_breakdown FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    temp.kilos_breakdown = (results[0].kilos_breakdown === 0) ? false : true;
                    temp.cycle = results[0].cycle;
                    return resolve();
                })
            })
        }

        const check_recycled_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT MIN(id) AS id FROM tare_containers WHERE status='R';`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0 && results[0].id !== null) {
                        response.row_id = results[0].id;
                        return resolve(true);
                    }
                    return resolve(false);
                })
            })
        }

        const use_recycled_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE tare_containers 
                    SET 
                        weight_id=${parseInt(weight_id)}, 
                        status='I', 
                        container_code=NULL,
                        container_weight=NULL,
                        container_amount=NULL 
                    WHERE id=${response.row_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const create_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`INSERT INTO tare_containers (weight_id, status) VALUES (${parseInt(weight_id)}, 'I');`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.row_id = results.insertId;
                    return resolve();
                })
            })
        }

        //RESET KILOS BREAKDOWN
        await check_kilos_breakdown();
        if (temp.kilos_breakdown) await reset_kilos_breakdown(weight_id, temp.cycle);

        const existing_row = await check_recycled_row();
        if (existing_row) await use_recycled_row();
        else await create_row();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error creating new line for empty containers in tare. ${e}`);
        error_handler(`Endpoint: /create_empty_containers_line -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/delete_tare_containers_row', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { row_id, first_row } = req.body,
    row_status = (first_row) ? 'I' : 'R',
    response = { success: false }

    try {

        const get_weight_id = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT weight_id FROM tare_containers WHERE id=${parseInt(row_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].weight_id);
                })
            })
        }

        const recycle_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE tare_containers 
                    SET 
                        status='${row_status}', 
                        container_code=NULL, 
                        container_weight=NULL, 
                        container_amount=NULL 
                    WHERE id=${parseInt(row_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const get_totals = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT gross_net, tare_containers, tare_net, final_net_weight 
                    FROM weights 
                    WHERE id=${weight_id};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.totals = {
                        gross_net: 1 * results[0].gross_net,
                        tare_containers: 1 * results[0].tare_containers,
                        tare_net: 1 * results[0].tare_net,
                        final_net_weight: 1 * results[0].final_net_weight
                    }
                    return resolve();
                })
            })
        }
        const weight_id = await get_weight_id();
        await recycle_row();
        await get_totals();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting row from tare containers. ${e}`);
        error_handler(`Endpoint: /delete_tare_containers_row -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_tare_container', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {row_id} = req.body,
    code = (req.body.code.length === 0) ? null : `${req.body.code}`,
    response = { success: false, container_found: false };

    try {

        const container_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT code, name, weight FROM containers WHERE code=${conn.escape(code)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.container = { 
                            code: results[0].code, 
                            name: results[0].name, 
                            weight: results[0].weight 
                        };
                        response.container_found = true;
                        return resolve(true);
                    }
                    return resolve(false);
                })
            })
        }

        const update_code = () => {
            return new Promise((resolve, reject) => {

                const container_weight = (code === null) ? null : response.container.weight;
                conn.query(`UPDATE tare_containers SET container_code='${response.container.code}', container_weight=${container_weight} WHERE id=${row_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT container_code, container_weight FROM tare_containers WHERE id=${row_id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.container.code = results[0].container_code;
                    response.container.weight = results[0].container_weight;
                    return resolve();
                })
            })
        }

        const get_container_data = await container_data();
        if (!get_container_data) {
            response.container = {
                name: null, weight: null, code: null 
            };
        }
        await update_code();
        if (code !== null) await check_update();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error updating tare container. ${e}`);
        error_handler(`Endpoint: /update_tare_container -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/search_tare_container_by_name', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    {partial_name} = req.body,
    response = { success: false };

    try {

        const search_container = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT code, name FROM containers WHERE name LIKE '%${partial_name}%' ORDER BY name ASC;`, (error, results, fields) => {
                    if (error) return reject(error);
                    response.containers = results;
                    return resolve();
                })
            })
        }
        await search_container();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error seaching container by name. ${e}`);
        error_handler(`Endpoint: /search_tare_container_by_name -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_tare_container_weight', userMiddleware.isLoggedIn, async (req, res) => {

    const
    weight = (req.body.weight === '') ? null : req.body.weight,
    { row_id } = req.body,
    response = { success: false };

    try {

        const update_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE tare_containers SET container_weight=${weight} WHERE id=${row_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT container_weight FROM tare_containers WHERE id=${row_id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.container_weight = results[0].container_weight;
                    return resolve();
                })
            })
        }

        await update_weight();
        await check_update();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error updating tare container weight. ${e}`);
        error_handler(`Endpoint: /update_tare_container_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/update_tare_container_amount', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {row_id} = req.body,
    amount = (req.body.amount === '') ? null : req.body.amount,
    response = { success: false }

    try {

        const update_amount = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE tare_containers SET container_amount=${amount} WHERE id=${row_id};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const check_update = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT container_amount FROM tare_containers WHERE id=${row_id};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.container_amount = results[0].container_amount;
                    return resolve();
                })
            })
        }

        await update_amount();
        await check_update();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error updating tare container amount. ${e}`);
        error_handler(`Endpoint: /update_tare_container_amount -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_tare_containers_totals', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id } = req.body,
    response = { 
        success: false,
        recycled_rows_ids: []
    };

    try {

        const recycle_empty_rows = (row_id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE tare_containers SET status='R' WHERE id=${row_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.recycled_rows_ids.push(row_id);
                    return resolve();
                })
            })
        }

        const check_empty_row = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM tare_containers 
                    WHERE status='I' AND container_code IS NULL AND container_weight IS NULL AND container_amount IS NULL
                    AND weight_id=${parseInt(weight_id)};
                `, async (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        for (let i = 0; i < results.length; i++) {
                            await recycle_empty_rows(results[i].id);
                        }
                    }
                    return resolve();
                })
            })
        }

        const get_totals = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT gross_net, tare_containers, tare_net, final_net_weight 
                    FROM weights WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.totals = {
                        gross_net: 1 * results[0].gross_net,
                        tare_containers: 1 * results[0].tare_containers,
                        tare_net: 1 * results[0].tare_net,
                        final_net_weight: 1 * results[0].final_net_weight
                    }
                    return resolve();
                })
            })
        }

        await check_empty_row();
        await get_totals();

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting tare containers totals. ${e}`);
        error_handler(`Endpoint: /get_tare_containers_totals -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/kilos_breakdown', userMiddleware.isLoggedIn, async (req, res) => {
    
    const
    { weight_id } = req.body,
    temp = {},
    response = { 
        success: false, 
        breakdown: { 
            docs: [], 
            kilos: 0, 
            informed_kilos: 0, 
            containers: 0,
            containers_weight: 0,
            final_net_weight: 0
        } 
    };

    try {

        const get_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT cycle, final_net_weight FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.breakdown.final_net_weight = results[0].final_net_weight;
                    return resolve(results[0].cycle);
                })
            })
        }

        const get_rows = (doc_id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT body.*, containers.name AS container_name, products.name AS product_name 
                    FROM documents_header header 
                    INNER JOIN documents_body body ON header.id=body.document_id 
                    LEFT OUTER JOIN containers ON body.container_code=containers.code 
                    INNER JOIN products ON body.product_code=products.code 
                    WHERE (body.status='I' OR body.status='T') AND body.document_id=${doc_id}
                    ORDER BY body.id ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results);
                })
            })
        }

        const get_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id, header.number, header.client_entity AS client_id, entities.name AS client_name, 
                    header.client_branch AS branch_id, entity_branches.name AS branch_name 
                    FROM documents_header header 
                    INNER JOIN entities ON header.client_entity=entities.id 
                    INNER JOIN entity_branches ON header.client_branch=entity_branches.id 
                    WHERE (header.status='T' OR header.status='I') AND weight_id=${parseInt(weight_id)};
                `, async (error, results, fields) => {
                    if (error) return reject(error);

                    for (let i = 0; i < results.length; i++) {
                        const doc = {
                            id: results[i].id,
                            entity: { 
                                id: results[i].client_id, 
                                name: results[i].client_name 
                            },
                            branch: { 
                                id: results[i].branch_id, 
                                name: results[i].branch_name 
                            },
                            number: results[i].number,
                            rows: []
                        };

                        const rows = await get_rows(doc.id);
                        rows.forEach(row => {
                            doc.rows.push({
                                container: {
                                    code: row.container_code, 
                                    name: row.container_name, 
                                    weight: row.container_weight, 
                                    amount: row.container_amount
                                },
                                id: row.id,
                                product: {
                                    code: row.product_code, 
                                    name: row.product_name, 
                                    new_kilos: 0, 
                                    price: row.price, 
                                    kilos: row.kilos, 
                                    informed_kilos: row.informed_kilos, 
                                    total: 1* row.product_total
                                }
                            });
                            response.breakdown.kilos += 1 * row.kilos;
                            response.breakdown.informed_kilos += 1 * row.informed_kilos;
                            response.breakdown.containers += 1 * row.container_amount;
                            response.breakdown.containers_weight += 1 * row.container_amount * row.container_weight;
                        });
                        response.breakdown.docs.push(doc);
                    }
                    return resolve();
                })
            })
        }

        const cycle = await get_cycle();
        await get_documents();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting kilos for breakdown. ${e}`);
        error_handler(`Endpoint: /kilos_breakdown -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/change_kilos_breakdown_status', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { weight_id } = req.body,
    response = { success: false }

    try {

        const change_status = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE weights SET kilos_breakdown=0 WHERE id=${parseInt(weight_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await change_status()
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error changing kilos breakdown status to false. ${e}`);
        error_handler(`Endpoint: /change_kilos_breakdown_status -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/save_kilos_breakdown', userMiddleware.isLoggedIn, async (req, res) => {
    
    const
    { weight_id, rows, kilos_informed } = req.body,
    changed_docs = [],
    response = { success: false };

    try {

        const get_cycle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`SELECT cycle FROM weights WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(results[0].cycle);
                })
            })
        }

        const save_breakdown = (row) => {
            return new Promise((resolve, reject) => {

                let query;

                //BOTH KILOS FIELDS IN ROW ARE NULL OR 0 (NO INFORMED KILOS)
                if (row.product.kilos * 1 === 0 && row.product.informed_kilos * 1 === 0) {

                    query = `
                        UPDATE documents_body 
                        SET 
                            kilos=${row.product.new_kilos}, 
                            informed_kilos=${row.product.new_kilos}, 
                            product_total=${row.product.new_kilos * row.product.price} 
                        WHERE id=${row.id};
                    `;
                    row.product.kilos = row.product.new_kilos;
                    row.product.informed_kilos = row.product.new_kilos;
                    row.product.total = row.product.new_kilos * row.product.price;
                    if (!changed_docs.includes(row.doc_id)) changed_docs.push(row.doc_id);
                }

                else {
                    const field = (cycle === 1) ? 'kilos' : 'informed_kilos';
                    query = `UPDATE documents_body SET ${field}=${row.product.new_kilos} WHERE id=${row.id};`;
                }
                
                conn.query(query, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const update_doc_total = (doc_id) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE documents_header SET document_total=
                        (
                            SELECT SUM(product_total) 
                            FROM documents_body 
                            WHERE (status='T' OR status='I') AND document_id=${doc_id}
                        ) 
                    WHERE id=${doc_id};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            }) 
        }

        const update_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`UPDATE weights SET kilos_breakdown=1 WHERE id=${parseInt(weight_id)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const cycle = await get_cycle();

        //SAVES KILOS FOR EACH ROW
        for (let i = 0; i < rows.length; i++) { await save_breakdown(rows[i]) }
        
        //UPDATED DOC TOTAL IN DOCUMENTS HEADER FOR EACH DOCUMENT THAT DIDNT HAVE INFORMED KILOS
        for (let i = 0; i < changed_docs.length; i++) { await update_doc_total(changed_docs[i]) }

        await update_weight();

        //CREATES NEW DOCUMENT OBJECTS FOR WEIGHT
        const documents_data = await get_weight_documents(weight_id, cycle);
        response.documents = documents_data.documents;
        response.kilos = documents_data.kilos.internal;
        response.informed_kilos = documents_data.kilos.informed;

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving kilos breakdown. ${e}`);
        error_handler(`Endpoint: /save_kilos_breakdown -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

/****************** FINISHED WEIGHTS *****************/
router.post('/get_finished_weights', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    {weight_status} = req.body,
    response = { success: false };

    try {

        const get_todays_weights = () => {
            return new Promise((resolve, reject) => {

                const 
                now = new Date(),
                year = now.getFullYear(),
                month = (now.getMonth() + 1 < 10) ? '0' + (now.getMonth() + 1) : now.getMonth() + 1,
                day = (now.getDate() < 10) ? '0' + (now.getDate()) : now.getDate(),
                date = year + '-' + month + '-' + day;

                conn.query(`
                    SELECT weights.created, weights.id, weights.cycle, cycles.name, weights.primary_plates AS plates, 
                    drivers.name AS driver, weights.gross_brute AS brute, weights.tare_net AS tare, 
                    weights.final_net_weight AS net
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE weights.status='${weight_status}' AND weights.cycle=1
                    AND created BETWEEN '${date}' AND '${date}'
                    ORDER BY weights.id DESC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.data = results;
                    if (results.length === 0) response.today = false;
                    else {
                        response.today = true;
                        response.date = date;
                    }
                    return resolve();
                })
            })
        }

        const get_weights = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.created, weights.id, weights.cycle, cycles.name, weights.primary_plates AS plates, 
                    drivers.name AS driver, weights.gross_brute AS brute, weights.tare_net AS tare, 
                    weights.final_net_weight AS net
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE weights.status='${weight_status}' AND weights.cycle=1
                    ORDER BY weights.id DESC LIMIT 100;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.data = results;
                    return resolve();
                })
            })
        }

        await get_todays_weights();
        if (response.data.length === 0) await get_weights();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting finished weights. ${e}`);
        error_handler(`Endpoint: /get_finished_weights -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_finished_weight', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_id } = req.body,
    response = { success: false };
    
    try {
        
        response.weight_object = await get_weight_data(weight_id);
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting weight data. ${e}`);
        error_handler(`Endpoint: /get_finished_weight -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_finished_weight_by_date', userMiddleware.isLoggedIn, async (req, res ) => {

    const
    { weight_status, start_date, end_date, plates, driver, cycle } = req.body,
    response = { success: false };

    try {

        const get_finished_weight = () => {
            return new Promise((resolve, reject) => {

                const
                plates_sql = (plates.length === 0) ? '' : `AND weights.primary_plates='${plates}'`,
                driver_sql = (driver.length === 0) ? '' : `AND drivers.name LIKE '%${driver}%'`;

                conn.query(`
                    SELECT weights.created, weights.id, weights.cycle, cycles.name, weights.primary_plates AS plates, 
                    drivers.name AS driver, weights.gross_brute AS brute, weights.tare_net AS tare, 
                    weights.final_net_weight AS net
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE weights.status='${weight_status}' ${plates_sql} ${driver_sql}
                    AND weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59'
                    AND weights.cycle=${cycle} ORDER BY weights.id DESC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.weights = results;
                    return resolve();
                })
            })
        }

        await get_finished_weight();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error gettting finished weight by date. ${e}`);
        error_handler(`Endpoint: /get_finished_weight_by_date -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally {  res.json(response) }
})

router.post('/get_finished_weight_by_id', userMiddleware.isLoggedIn, async (req, res) => {

    const
    {weight_id} = req.body,
    response = { success: false };

    try {

        const get_weight = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT weights.created, weights.id, weights.cycle, cycles.name, weights.primary_plates AS plates, 
                    drivers.name AS driver, weights.gross_brute AS brute, weights.tare_net AS tare, 
                    weights.final_net_weight AS net
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE weights.id=${parseInt(weight_id)}
                    ORDER BY weights.id DESC;
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.weight = results[0];
                    return resolve();
                })
            })
        }

        await get_weight();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting finished weight by ID. ${e}`);
        error_handler(`Endpoint: /get_finished_weight_by_id -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_finished_weights_by_plates', userMiddleware.isLoggedIn, async (req,res ) => {

    const
    { weight_status, plates, driver, cycle, start_date, end_date } = req.body,
    response = { success: false };

    try {

        const get_weights = () => {
            return new Promise((resolve, reject) => {
                
                const 
                plates_sql = (plates.length === 0) ? '' : `weights.primary_plates='${plates}' AND`,
                driver_sql = (driver.length === 0) ? '' : `drivers.name LIKE '%${driver}%' AND`;

                conn.query(`
                    SELECT weights.created, weights.id, weights.cycle, cycles.name, weights.primary_plates AS plates, 
                    drivers.name AS driver, weights.gross_brute AS brute, weights.tare_net AS tare, 
                    weights.final_net_weight AS net
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE ${plates_sql} ${driver_sql} weights.cycle=${cycle} AND weights.status='${weight_status}'
                    AND weights.created BETWEEN '${new_start_date} 00:00:00' AND '${new_end_date} 23:59:59'
                    ORDER BY weights.id DESC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.weights = results;
                    response.date = { start: new_start_date, end: new_end_date };
                    return resolve();
                })
            })
        }

        let new_start_date, new_end_date;

        if (!validate_date(start_date) || !validate_date(end_date)) {

            new_start_date = '2019-01-01';

            const 
            now = new Date(),
            year = now.getFullYear(),
            month = (now.getMonth() + 1 < 10) ? '0' + (now.getMonth() + 1) : now.getMonth() + 1,
            day = (now.getDate() + 1 < 10) ? '0' + (now.getDate()) : now.getDate();

            new_end_date = year + '-' + month + '-' + day;

        } else {
            new_start_date = start_date;
            new_end_date = end_date;
        }

        await get_weights();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting finished weights by plates. ${e}`);
        error_handler(`Endpoint: /get_finished_weights_by_plates -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_finished_weights_by_driver', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_status, driver, plates, cycle, start_date, end_date } = req.body,
    response = { success: false };

    try {

        const get_weights = () => {
            return new Promise((resolve, reject) => {

                const plates_sql = (plates.length === 0) ? '' : `AND weights.primary_plates='${plates}'`;

                conn.query(`
                    SELECT weights.created, weights.id, weights.cycle, cycles.name, weights.primary_plates AS plates, 
                    drivers.name AS driver, weights.gross_brute AS brute, weights.tare_net AS tare, 
                    weights.final_net_weight AS net
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE drivers.name LIKE '%${driver}%' AND weights.cycle=${cycle} AND weights.status='${weight_status}'
                    AND weights.created BETWEEN '${new_start_date} 00:00:00' AND '${new_end_date} 23:59:59' ${plates_sql}
                    ORDER BY weights.id DESC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.weights = results;
                    response.date = {
                        start: new_start_date,
                        end: new_end_date
                    }
                    return resolve();
                })
            })
        }

        let new_start_date, new_end_date;
        if (!validate_date(start_date) || !validate_date(end_date)) {

            new_start_date = '2019-01-01';

            const 
            now = new Date(),
            year = now.getFullYear(),
            month = (now.getMonth() + 1 < 10) ? '0' + (now.getMonth() + 1) : now.getMonth() + 1,
            day = (now.getDate() + 1 < 10) ? '0' + (now.getDate()) : now.getDate();

            new_end_date = year + '-' + month + '-' + day;

        } else {
            new_start_date = start_date;
            new_end_date = end_date;
        }

        await get_weights();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting weights by driver. ${e}`);
        error_handler(`Endpoint: /get_finished_weights_by_driver -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_finished_weights_by_cycle', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { weight_status, cycle, driver, plates, start_date, end_date } = req.body,
    response = { success: false };

    try {

        const get_weights = () => {
            return new Promise((resolve, reject) => {

                const
                driver_sql = (driver.length === 0) ? '' : `AND drivers.name LIKE '%${driver}%'`,
                plates_sql = (plates.length === 0) ? '' : `AND weights.primary_plates='${plates}'`

                conn.query(`
                    SELECT weights.created, weights.id, weights.cycle, cycles.name, weights.primary_plates AS plates, 
                    drivers.name AS driver, weights.gross_brute AS brute, weights.tare_net AS tare, 
                    weights.final_net_weight AS net
                    FROM weights
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    INNER JOIN drivers ON weights.driver_id=drivers.id
                    WHERE weights.cycle=${parseInt(cycle)} AND weights.status='${weight_status}' ${driver_sql} ${plates_sql}
                    AND weights.created BETWEEN '${new_start_date} 00:00:00' AND '${new_end_date} 23:59:59' ${plates_sql}
                    ORDER BY weights.id DESC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.weights = results;
                    response.date = {
                        start: new_start_date,
                        end: new_end_date
                    }
                    return resolve();
                })
            })
        }

        const get_last_season = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT beginning, ending FROM seasons WHERE id=(
                        SELECT MAX(id) FROM seasons
                    );
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve({ 
                        start: results[0].beginning.toISOString().split('T')[0], 
                        end: (results[0].ending === null) ? todays_date() :  results[0].ending.toISOString().split('T')[0]
                    });
                })
            })
        }

        let new_start_date, new_end_date;
        if (!validate_date(start_date) || !validate_date(end_date)) {

            const this_season = await get_last_season()

            new_start_date = this_season.start + ' 00:00:00';
            new_end_date = this_season.end;

        } else {
            new_start_date = start_date;
            new_end_date = end_date;
        }

        await get_weights();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting weights by cycle. ${e}`);
        error_handler(`Endpoint: /get_finished_weights_by_cycle -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

/********************** CLIENTS / PROVIDERS *********************/
router.post('/get_entities_data', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { status, type } = req.body,
    type_sql = (type.length > 1) ? '' : `AND entities.type='${type.substring(0, 1)}'`,
    status_sql = (status.length > 1) ? '' : `AND entities.status='${status.substring(0, 1)}'`,
    response = { success: false }

    console.log(req.body)

    try {

        const get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entities.id, entities.status, entities.type, entities.rut, entities.name, giros.giro
                    FROM entities
                    INNER JOIN giros ON entities.giro=giros.id
                    WHERE entities.name <> '' ${type_sql} ${status_sql}
                    ORDER BY entities.name ASC; 
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }

        await get_entities()
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting entities data. ${e}`);
        error_handler(`Endpoint: /get_entities_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/search_client_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity } = req.body,
    response = { success: false }

    try {

        const get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entities.id, entities.status, entities.type, entities.rut, entities.name, giros.giro
                    FROM entities
                    INNER JOIN giros ON entities.giro=giros.id
                    WHERE entities.name LIKE '%${entity}%'
                    ORDER BY entities.name ASC; 
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }

        await get_entities();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting client entities. ${e}`);
        error_handler(`Endpoint: /search_client_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_entity_data', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity_id } = req.body,
    response = { success: false }

    try {

        const get_entity_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entities.id, entities.status, entities.type, entities.rut, 
                    entities.name, entities.phone, entities.email, entities.giro
                    FROM entities
                    INNER JOIN giros ON entities.giro=giros.id
                    WHERE entities.id=${conn.escape(entity_id)}; 
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.entity = results[0];
                    return resolve();
                })
            })
        }

        const get_entity_branches = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT branch.id, branch.name, comunas.comuna, branch.address, branch.phone, branch.email
                    FROM entity_branches branch
                    INNER JOIN comunas ON branch.comuna=comunas.id
                    WHERE branch.entity_id=${conn.escape(entity_id)}
                    ORDER BY branch.name ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.branches = results;
                    return resolve();
                })
            })
        }

        await get_entity_data();
        await get_entity_branches();
        response.giros = await get_giros();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting entity data. ${e}`);
        error_handler(`Endpoint: /get_entity_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_branch_data', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { branch_id } = req.body,
    response = { success: false }

    try {

        const get_branch = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT branch.id, branch.name, comunas.id AS comuna, comunas.region_id AS region, branch.address, branch.phone, branch.email
                    FROM entity_branches branch
                    INNER JOIN comunas ON branch.comuna=comunas.id
                    WHERE branch.id=${conn.escape(branch_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.branch = results[0];
                    return resolve();
                })
            })
        }

        const get_comunas = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM regiones;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.regions = results;
                    return resolve();
                })
            })
        }

        await get_branch();
        await get_comunas();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting branch data. ${e}`);
        error_handler(`Endpoint: /get_branch_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response); }
})

router.get('/get_giros', userMiddleware.isLoggedIn, async (req, res) => {
    
    const response = { success: false }

    try {

        response.giros = await get_giros();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting giros. ${e}`);
        error_handler(`Endpoint: /get_giros -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.get('/get_regions', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false }

    try {

        const get_regions = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM regiones;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.regions = results;
                    return resolve();
                })
            })
        }

        await get_regions();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting regions. ${e}`);
        error_handler(`Endpoint: /get_regions -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/clients_save_data', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { client_id, name, rut, giro, type, phone, email, status } = req.body,
    response = { success: false }

    try {

        const save_data = () =>  {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE entities
                    SET
                        status=${conn.escape(status)},
                        type=${conn.escape(type)},
                        rut=${conn.escape(formatted_rut)},
                        name=${conn.escape(name)},
                        phone=${conn.escape(phone)},
                        email=${conn.escape(email)},
                        giro=${conn.escape(giro)}
                    WHERE id=${conn.escape(client_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                });
            })
        }
        
        if (! await validate_rut(rut)) throw 'RUT Inválido';
        const formatted_rut = await format_rut(rut);
        await save_data();
        response.formatted_rut = formatted_rut;
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving entity data. ${e}`);
        error_handler(`Endpoint: /clients_save_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/save_branch_data', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { branch_id, name, address, comuna, phone } = req.body,
    response = { success: false }

    try {

        const save_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE entity_branches
                    SET 
                        name=${conn.escape(name)},
                        comuna=${conn.escape(comuna)},
                        address=${conn.escape(address)},
                        phone=${conn.escape(phone)}
                    WHERE id=${conn.escape(branch_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await save_data();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving branch data. ${e}`);
        error_handler(`Endpoint: /save_branch_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_branch', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { entity_id, name, address, comuna, phone } = req.body,
    response = { success: false }

    try {

        const create_branch = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO entity_branches
                    (entity_id, name, comuna, address, phone)
                    VALUES (${conn.escape(entity_id)}, ${conn.escape(name)}, ${conn.escape(comuna)}, ${conn.escape(address)}, ${conn.escape(phone)});
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.branch_id = results.insertId;
                    return resolve();
                })
            })
        }

        const get_branch_comuna = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT comuna FROM comunas WHERE id=${conn.escape(comuna)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.comuna = results[0].comuna;
                    return resolve();
                })
            })
        }

        await create_branch();
        await get_branch_comuna();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error creating branch. ${e}`);
        error_handler(`Endpoint: /create_branch -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/delete_branch', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity, branch } = req.body,
    response = { success: false }

    try {

        const check_branch_registries= () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM documents_header WHERE client_entity=${conn.escape(entity)} AND client_branch=${conn.escape(branch)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) return resolve(true);
                    return resolve(false);
                })
            })
        }        

        const delete_branch = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    DELETE FROM entity_branches WHERE id=${conn.escape(branch)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const branch_with_registries = await check_branch_registries();
        if (!branch_with_registries) await delete_branch();
        else throw 'Sucursal con registros en la base de datos';
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting branch. ${e}`);
        error_handler(`Endpoint: /delete_branch -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { name, rut, giro, type, phone, email, status } = req.body,
    response = { success: false }

    try {

        const check_existing_rut = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT name, rut FROM entities WHERE rut='${formatted_rut}';
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.existing_entity = {
                            name: results[0].name,
                            rut: results[0].rut
                        }
                        return resolve(true);
                    }
                    return resolve(false);
                });
            })
        }

        const create_entity = () =>  {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO entities (status, type, rut, name, phone, email, giro)
                    VALUES (
                        ${conn.escape(status)}, 
                        ${conn.escape(type)}, 
                        ${conn.escape(formatted_rut)}, 
                        ${conn.escape(name)}, 
                        ${conn.escape(phone)}, 
                        ${conn.escape(email)},
                        ${conn.escape(giro)})
                    ;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entity_id = results.insertId;
                    return resolve();
                });
            })
        }
        
        if (! await validate_rut(rut)) throw 'RUT Inválido';
        const formatted_rut = await format_rut(rut);

        const entity_exists = await check_existing_rut();
        if (entity_exists) throw 'Entidad con RUT ingresado ya existe.';
        await create_entity();
        response.formatted_rut = formatted_rut;
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving entity data. ${e}`);
        error_handler(`Endpoint: /create_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/delete_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity } = req.body,
    response = { success: false }

    try {

        const check_entity_registries= () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM documents_header WHERE client_entity=${conn.escape(entity)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) return resolve(true);
                    return resolve(false);
                })
            })
        }        

        const delete_entity = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    DELETE FROM entities WHERE id=${conn.escape(entity)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const entity_with_regisitries = await check_entity_registries();
        if (!entity_with_regisitries) await delete_entity();
        else throw 'Entidad con registros en las base de datos';
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting entity. ${e}`);
        error_handler(`Endpoint: /delete_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

/********************** PRODUCTS *********************/
router.post('/get_products', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { type } = req.body,
    type_sql = (type === 'All') ? '' : `AND type=${conn.escape(type)}`,
    response = { success: false }

    try {

        const get_products = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT code, name, type, image FROM products WHERE code <> '' ${type_sql} ;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.products = results;
                    return resolve();
                })
            )
        }

        await get_products();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting products. ${e}`);
        error_handler(`Endpoint: /get_products -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_product', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { code } = req.body,
    response = { success: false }

    try {

        const get_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT code, name, type, image FROM products WHERE code=${conn.escape(code)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.product = {
                        code: results[0].code,
                        name: results[0].name,
                        type: results[0].type,
                        image: results[0].image
                    };
                    return resolve();
                })
            )
        }

        await get_product();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting product data. ${e}`);
        error_handler(`Endpoint: /get_product -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }

})

router.post('/delete_product', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { product_code } = req.body,
    response = { success: false }

    try {

        const check_product_records = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT id FROM documents_body WHERE product_code=${conn.escape(product_code)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(false);
                    return resolve(true);
                })
            )
        }

        const delete_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    DELETE FROM products WHERE code=${conn.escape(product_code)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            )
        }

        const product_with_records = await check_product_records();
        if (product_with_records) throw 'Producto tiene registros en la base de datos.';

        await delete_product();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting product. ${e}`);
        error_handler(`Endpoint: /delete_product -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/create_save_product', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { create, code,  type, primary_name, secondary_name } = req.body,
    name = (secondary_name.length === 0) ? primary_name : primary_name + ' - ' + secondary_name,
    response = { success: false }

    try {

        const check_product_records = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT id FROM products WHERE code=${conn.escape(code)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(false);
                    return resolve(true);
                })
            )
        }

        const create_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    INSERT INTO products (code, name, type, created, created_by)
                    VALUES (
                        ${conn.escape(code).toUpperCase()},
                        '${type + ' ' + name}',
                        '${type}',
                        '${todays_date()}',
                        ${req.userData.userId}
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.product_id = results.insertId;
                    return resolve();
                })
            )
        }

        const check_created_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT code, name, type, image FROM products WHERE id=${response.product_id} ;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.products = results;
                    return resolve();
                })
            )
        }

        const save_product = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE products
                    SET 
                        name=${conn.escape(name)},
                        type=${conn.escape(type)}
                    WHERE code=${conn.escape(code)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        if (create) {

            const product_with_records = await check_product_records();
            if (product_with_records) throw 'Producto ya existe en base de datos';
    
            await create_product();
            await check_created_product();
    
        } else await save_product();

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error creating product. ${e}`);
        error_handler(`Endpoint: /create_save_product -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

/********************** VEHICLES *********************/
router.post('/list_vehicles', userMiddleware.isLoggedIn, async (req, res) => {

    const
    status = (req.body.status) ? 1 : 0,
    internal = (req.body.internal) ? 1 : 0,
    response = { success: false };

    try {

        const list_vehicles = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.status=${status} AND vehicles.internal=${internal};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicles = results;
                    return resolve();
                })
            })
        }

        await list_vehicles();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error listing vehicles. ${e}`);
        error_handler(`Endpoint: /list_vehicles -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_vehicle', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { primary_plates } = req.body,
    response = { success: false }

    try {

        const get_vehicle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.primary_plates=${conn.escape(primary_plates)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicle = results[0];
                    return resolve();
                })
            })
        }

        get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, name FROM entities WHERE type='T' ORDER BY name ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }
        
        await get_vehicle();
        await get_entities();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicle data. ${e}`);
        error_handler(`Endpoint: /get_vehicle -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_vehicle_default_driver', userMiddleware.isLoggedIn, async(req, res) => {

    const 
    { plates } = req.body,
    response = { 
        success: false,
        driver: null
    }

    try {

        const get_driver = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.id, vehicles.driver_id, drivers.rut, drivers.name, drivers.phone, drivers.internal, drivers.active 
                    FROM vehicles 
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    WHERE vehicles.primary_plates=${conn.escape(plates)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.driver = {
                            id: results[0].driver_id,
                            rut: results[0].rut,
                            name: results[0].name,
                            phone: results[0].phone,
                            internal: results[0].internal,
                            active: results[0].active
                        }
                    }
                    return resolve(true);
                })
            })
        }

        await get_driver();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicles default driver data. ${e}`);
        error_handler(`Endpoint: /get_vehicle_default_driver -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/save_vehicle_data', userMiddleware.isLoggedIn, async(req, res) => {

    const 
    { primary_plates, secondary_plates, internal, active } = req.body,
    transport_id = (req.body.transport_id === 'none') ? null : parseInt(req.body.transport_id),
    driver_id = (req.body.driver_id === null) ? null : parseInt(req.body.driver_id),
    response = { success: false }

    try {

        const update_vehicle_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE vehicles 
                    SET
                        status=${parseInt(active)},
                        internal=${parseInt(internal)},
                        secondary_plates=${conn.escape(secondary_plates)},
                        transport_id=${transport_id},
                        driver_id=${driver_id}
                    WHERE primary_plates=${conn.escape(primary_plates)}; 
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await update_vehicle_data();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error saving vehicle data. ${e}`);
        error_handler(`Endpoint: /save_vehicle_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_vehicles_by_plates', userMiddleware.isLoggedIn, async (req, res) => {

    const
    partial_plates = req.body.partial_plates.replace(/[^0-9a-z]/gmi, ''),
    response = { success: false }

    try {

        const get_vehicles_from_partial_plates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.primary_plates LIKE '%${partial_plates}%' ORDER BY vehicles.primary_plates ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicles = results;
                    return resolve();
                })
            })
        }

        await get_vehicles_from_partial_plates();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicles by plates. ${e}`);
        error_handler(`Endpoint: /save_vehicle_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/get_vehicles_from_filters', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { status, internal } = req.body,
    status_sql = (status === 'All' || status.length === 0) ? '' : `vehicles.status=${parseInt(status)}`,
    and_operator = (status === 'All' || status.length === 0) ? '' : 'AND',
    internal_sql = (internal === 'All' || internal.length === 0) ? '' : `AND vehicles.internal=${parseInt(internal)}`,
    response = { success: false }

    try {

        const get_vehicles_from_filters = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.primary_plates <> '' ${and_operator} ${status_sql} ${internal_sql} ORDER BY vehicles.primary_plates ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicles = results;
                    return resolve();
                })
            })
        }

        await get_vehicles_from_filters();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicles by filters. ${e}`);
        error_handler(`Endpoint: /get_vehicles_from_filters -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/delete_vehicle', userMiddleware.isLoggedIn, async (req, res) => {
    
    const 
    { plates } = req.body,
    response = { success: false }

    try {

        const check_records = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM weights WHERE primary_plates=${conn.escape(plates)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(true);
                    return resolve(false);
                })
            })
        }

        const delete_vehicle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    DELETE FROM vehicles WHERE primary_plates=${conn.escape(plates)}
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const allowed_to_delete = await check_records();
        if (!allowed_to_delete) throw `Vehículo ${plates} tiene registros en la base de datos y por lo tanto no puede ser eliminado`;
        
        await delete_vehicle();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error deleting vehicle. ${e}`);
        error_handler(`Endpoint: /delete_vehicles -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

/********************** ANALYTICS CONTAINERS STOCK *********************/
router.get('/analytics_stock_get_entities', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    response = { 
        success: false,
        entities: [],
        internal: []
        
    },
    temp = {
        total_receptions: 0,
        total_dispatches: 0
    };

    try {

        const get_current_season = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, beginning, ending FROM seasons ORDER BY id DESC LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    temp.season = { 
                        id: results[0].id,
                        start: results[0].beginning.toISOString().split('T')[0] + ' 00:00:00',
                        end: (results[0].ending === null) ? todays_date() : results[0].ending.toLocaleString('es-CL').split(' ')[0]
                    }
                    return resolve();
                })
            })
        }

        const movements = (entity, cycle) => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT SUM(body.container_amount) AS total
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN documents_body body ON header.id=body.document_id
                    INNER JOIN containers ON body.container_code=containers.code
                    WHERE weights.cycle=${cycle} AND header.client_entity=${entity} AND containers.type='Bins Plastico'
                    AND (weights.status='T' OR weights.status='I') AND (header.status='T' OR header.status='I')
                    AND (weights.created BETWEEN '${temp.season.start}' AND '${temp.season.end}');
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(1 * results[0].total)
                })
            })
        }

        const get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM entities WHERE status=1 AND type <> 'T' AND id <> 183 ORDER BY type ASC, name ASC;
                `, async (error, results, fields) => {

                    if (error) return reject(error);
                    for (let i = 0; i < results.length; i++) {

                        const entity = {
                            id: results[i].id,
                            initial_stock: 0,
                            name: results[i].name,
                            rut: results[i].rut,
                            type: results[i].type
                        }
                        entity.receptions = await movements(entity.id, 1);
                        entity.dispatches = await movements(entity.id, 2);
                        entity.stock = entity.dispatches - entity.receptions;
                        temp.total_receptions += entity.receptions;
                        temp.total_dispatches += entity.dispatches;
                        response.entities.push(entity);
                    }
                    return resolve();
                })
            })
        }

        const get_internal_initial_stock = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT initial_stock 
                    FROM containers
                    WHERE initial_stock IS NOT NULL AND type='Bins Plastico';
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    
                    let initial_bins_stock = 0;
                    for (let i = 0; i < results.length; i++) { initial_bins_stock += results[i].initial_stock }
                    
                    response.entities.unshift({
                        id: 183,
                        name: 'Soc. Soc. Comercial Lepefer y Cia Ltda.',
                        rut: '78.447.760-6',
                        type: 'Interno',
                        initial_stock: initial_bins_stock,
                        receptions: temp.total_receptions,
                        dispatches: temp.total_dispatches,
                        stock: temp.total_receptions + initial_bins_stock - temp.total_dispatches
                    });
                    
                    return resolve();
                })
            })
        }

        await get_current_season();
        await get_entities();
        await get_internal_initial_stock();

        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting stock for entities. ${e}`);
        error_handler(`Endpoint: /analytics_stock_get_entities -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

router.post('/analytics_entity_movements', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity_id } = req.body,
    temp = {},
    response = { 
        success: false,
        receptions: [],
        dispatches: []
    }

    try {

        const get_current_season = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, beginning, ending FROM seasons ORDER BY id DESC LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    temp.season = { 
                        id: results[0].id,
                        start: results[0].beginning.toISOString().split('T')[0] + ' 00:00:00',
                        end: (results[0].ending === null) ? todays_date() : results[0].ending.toISOString().split('T')[0] + ' 00:00:00'
                    }
                    return resolve();
                })
            })
        }

        const get_documents = cycle => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id, header.number, header.date, header.document_total, header.client_entity AS entity_id, 
                    entity.name AS entity_name, header.client_branch AS client_branch_id, branch.name AS client_branch_name,
                    header.internal_entity AS internal_entity_id, internal_entities.name AS internal_entity_name,
                    header.internal_branch AS internal_branch_id, internal_branches.name AS internal_branch_name
                    FROM documents_header header
                    INNER JOIN entities entity ON header.client_entity=entity.id
                    INNER JOIN entity_branches branch ON header.client_branch=branch.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN internal_entities ON header.internal_entity=internal_entities.id
                    INNER JOIN internal_branches ON header.internal_branch=internal_branches.id
                    WHERE weights.cycle=${cycle} AND (weights.status='T' OR weights.status='I')
                    AND (header.status='T' OR header.status='I') AND header.client_entity=${entity_id}
                    AND (weights.created BETWEEN '${temp.season.start}' AND '${temp.season.end}');
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    
                    for (let i = 0; i < results.length; i++) {
                        
                        const document = {
                            id: results[i].id,
                            number: results[i].number,
                            date: results[i].date.toLocaleString('es-CL').split(' ')[0],
                            total: results[i].document_total,
                            client: {
                                entity: {
                                    id: results[i].entity_id,
                                    name: results[i].entity_name    
                                },
                                branch: {
                                    id: results[i].client_branch_id,
                                    name: results[i].client_branch_name
                                }
                            },
                            internal: {
                                entity: {
                                    id: results[i].internal_entity_id,
                                    name: results[i].internal_entity_name
                                },
                                branch: {
                                    id: results[i].internal_branch_id,
                                    name: results[i].internal_branch_name
                                }
                            }
                        }

                        if (cycle === 1) response.receptions.push(document);
                        else response.dispatches.push(document);
                    }
                    return resolve();
                })
            })
        }

        await get_current_season();
        await get_documents(1);
        await get_documents(2);

        response.success = true;

    } catch(e) {
        response.error = e;
        console.log(`Error analytics entity movements. ${e}`);
        error_handler(`Endpoint: /analytics_entity_movements -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }

})

module.exports = { router, error_handler };