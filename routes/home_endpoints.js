const express = require('express');
const home_router = express.Router();
const conn = require('../config/db');

const { userMiddleware, validate_date, todays_date, error_handler } = require('./routes_functions');

home_router.get('/grapes_data', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { 
        success: false,
        seasons: [],
        total: { packing: 0, parron: 0 },
        cycle: 2,
        type: 'Pasas'
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
                    WHERE body.product_code='${code}' AND body.cut='${cut}' AND weights.status='T' AND weights.cycle=${response.cycle}
                    AND (header.status='I' OR header.status='T')
                    AND (body.status='I' OR body.status='T') 
                    AND (
                        weights.created BETWEEN 
                            '${response.seasons[response.seasons.length - 1].start} 00:00:00' AND
                            '${response.seasons[response.seasons.length - 1].end} 23:59:59'
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
                    WHERE weights.cycle=${response.cycle} AND weights.status='T' AND products.type='${response.type}'
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

home_router.get('/get_kilos_by_providers', userMiddleware.isLoggedIn, async (req, res) => {

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

home_router.post('/get_products_by_date', userMiddleware.isLoggedIn, async (req, res) => {

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
        },
        products: []
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
                    SELECT products.code, products.name, products.type, products.color, products.image,
                    body.cut, body.kilos
                    FROM documents_body body
                    INNER JOIN products ON body.product_code=products.code
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE weights.cycle=${conn.escape(cycle)} AND weights.status='T' AND products.type=${conn.escape(product_type)}
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T')
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59')
                    AND body.product_code IS NOT NULL
                    ORDER BY products.name ASC;
                `, async (error, results, fields) => {
                        
                    if (error) return reject(error);

                    const products_array = [];

                    let current_index = 0;

                    for (let product of results) {

                        if (products_array.includes(product.code)) continue;
                        products_array.push(product.code);

                        const this_product = {
                            code: product.code,
                            color: product.color,
                            image: product.image,
                            kilos: {
                                packing: 0,
                                parron: 0
                            },
                            name: product.name,
                            type: product.type
                        }

                        //SUM PACKING
                        for (let j = 0; j < results.length; j++) {
                            if (results[j].code !== this_product.code || results[j].cut !== 'Packing') continue;
                            this_product.kilos.packing += results[j].kilos;
                        }

                        //SUM PARRON
                        for (let j = 0; j < results.length; j++) {
                            if (results[j].code !== this_product.code || results[j].cut !== 'Parron') continue;
                            this_product.kilos.parron += results[j].kilos;
                        }

                        this_product.total = this_product.kilos.packing + this_product.kilos.parron;
                        response.total.packing += this_product.kilos.packing;
                        response.total.parron += this_product.kilos.parron;

                        response.products.push(this_product)

                    }

                    /*

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
                    */
                    return resolve();
                })
            })
        }

        const get_warehouse_kilos = (target_cycle, code, cut) => {
            return new Promise((resolve, reject) => {
                const cycle_sql = (target_cycle === 1) ? 'AND (weights.cycle=1 OR weights.cycle=3)' : `AND weights.cycle=${target_cycle}`;
                conn.query(`
                    SELECT SUM(body.kilos) AS kilos
                    FROM documents_body body
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN products ON body.product_code=products.code
                    WHERE body.product_code='${code}' AND cut='${cut}'
                    AND weights.status='T' AND products.type=${conn.escape(product_type)}
                    ${cycle_sql} AND (header.status='I' OR header.status='T')
                    AND (body.status='I' OR body.status='T')
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59');
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    return resolve(1 * results[0].kilos);
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
                    WHERE (weights.cycle=3 OR weights.cycle=1) AND header.internal_branch=3
                    AND weights.status='T' AND products.type=${conn.escape(product_type)}
                    AND (header.status='I' OR header.status='T') 
                    AND (body.status='I' OR body.status='T')
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59')
                    GROUP BY products.name ORDER BY products.name ASC;
                `, async (error, results, fields) => {
                    if (error) return reject(error);

                    response.products = results;

                    for (let i = 0; i < response.products.length; i++) {
                        
                        const 
                        packing = await get_warehouse_kilos(1, response.products[i].code, 'Packing'),
                        parron = await get_warehouse_kilos(1, response.products[i].code, 'Parron');

                        response.products[i].total = packing + parron;
                        response.products[i].kilos = { packing, parron };
                        response.total.packing += packing;
                        response.total.parron += parron;
                    }
                    
                    return resolve();
                })
            })
        }

        const get_warehouse_stock = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT products.code, products.name, products.type, products.color, products.image
                    FROM documents_body body
                    INNER JOIN products ON body.product_code=products.code
                    INNER JOIN documents_header header ON body.document_id=header.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE weights.status='T' AND products.type=${conn.escape(product_type)}
                    AND (header.status='I' OR header.status='T') 
                    AND (body.status='I' OR body.status='T')
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59')
                    GROUP BY products.name 
                    ORDER BY products.name ASC;
                `, async (error, results, fields) => {
                    if (error) return reject(error);

                    response.products = results;

                    for (let i = 0; i < response.products.length; i++) {
                        
                        const 
                        reception_packing = await get_warehouse_kilos(1, response.products[i].code, 'Packing'),
                        reception_parron = await get_warehouse_kilos(1, response.products[i].code, 'Parron'),
                        dispatch_packing = await get_warehouse_kilos(2, response.products[i].code, 'Packing'),
                        dispatch_parron = await get_warehouse_kilos(2, response.products[i].code, 'Parron'),
                        packing = (reception_packing - dispatch_packing),
                        parron = (reception_parron - dispatch_parron);

                        response.products[i].total = packing + parron;
                        response.products[i].kilos = { packing, parron };
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
        else if (cycle === 0) await get_warehouse_stock();
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

home_router.post('/get_products_movements', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { cycle, start_date, end_date, product_code} = req.body,
    cycle_sql = (cycle === 3) ? `AND (weights.cycle=1 OR weights.cycle=3)` : `AND weights.cycle=${cycle}`,
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
                    ${cycle_sql} AND header.client_entity=${id} AND weights.status='T';
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

home_router.post('/get_product_documents', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { client_id, product_code, cycle, start_date, end_date } = req.body,
    cycle_sql = (client_id === '183') ? `weights.cycle=${parseInt(cycle)}` : `(weights.cycle=3 OR weights.cycle=1)`,
    response = { 
        data: [],
        success: false 
    };

    console.log(req.body);

    try {

        const get_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id, weights.gross_date AS date, header.number, entity_branches.name AS branch, 
                    weights.primary_plates AS plates, body.kilos
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    INNER JOIN entity_branches ON header.client_branch=entity_branches.id
                    INNER JOIN weights ON header.weight_id=weights.id
                    WHERE body.product_code=${conn.escape(product_code)} 
                    AND (weights.created BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59') 
                    AND (header.status='I' OR header.status='T') AND (body.status='I' OR body.status='T') 
                    AND ${cycle_sql} AND weights.status='T' AND 
                    header.client_entity=${conn.escape(client_id)};
                `, async (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results);
                })
            })
        }        

        if (!validate_date(start_date)) throw 'Fecha inválida.';
        if (!validate_date(end_date)) throw 'Fecha inválida.';

        const documents = await get_documents();

        const docs_array = [];

        for (let document of documents) {
            
            if (docs_array.includes(document.id)) continue;
            docs_array.push(document.id);

            const this_document = {
                id: document.id,
                date: document.date,
                number: document.number,
                branch: document.branch,
                plates: document.plates,
                kilos: 0
            }

            for (let i = 0; i < documents.length; i++) {
                if (documents[i].id !== this_document.id) continue;
                this_document.kilos += documents[i].kilos;
            }
            
            response.data.push(this_document);
        }

        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting product documents. ${e}`);
        error_handler(`Endpoint: /get_product_documents -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
});

module.exports = { home_router }