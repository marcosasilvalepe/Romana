"use strict";

const mysql = require('mysql');

const conn = mysql.createConnection({ 
    host: "localhost",
    port: 3306,
    user: "root", 
    password: "", 
    database: "romana" 
});
    

const excel = require('exceljs');

function thousand_separator(num) { 
	return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') 
}

const get_grapes_providers = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT entities.id, entities.name, entities.rut
            FROM weights
            INNER JOIN documents_header header ON weights.id=header.weight_id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T'AND header.status='I' AND weights.cycle=2 AND
            (weights.created BETWEEN '2021-12-01 00:00:00' AND '2022-08-09 23:59:59')
            GROUP BY entities.id
            ORDER BY entities.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_providers_kilos = (provider_id, field) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM(body.${field}) AS kilos
            FROM documents_header header 
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN products ON body.product_code=products.code
            WHERE body.status='T' AND header.status='I' AND weights.status='T' AND weights.cycle=2
            AND (weights.created BETWEEN '2021-12-01 00:00:00' AND '2022-08-09 23:59:59')
            AND products.type='Pasas'
            AND header.client_entity=${provider_id};
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);
            return resolve(results[0].kilos);
        })
    })
}

(async () => {
    try {

        const providers = await get_grapes_providers();
        
        let total = 0, inf_total = 0;

        for (let i = 0; i < providers.length; i++) {
            providers[i].kilos = await get_providers_kilos(providers[i].id, 'kilos');
            providers[i].informed_kilos = await get_providers_kilos(providers[i].id, 'informed_kilos')
            providers[i].difference = providers[i].kilos - providers[i].informed_kilos;

            total += providers[i].kilos;
            inf_total += providers[i].informed_kilos;
        }
        
        console.log(JSON.stringify(providers))
        //console.table(providers)
        //console.log(total, inf_total)
    } 
    catch(e) { console.log(e) }
    finally { process.exit() }
})();