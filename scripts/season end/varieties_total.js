"use strict";

const mysql = require('mysql');

const conn = mysql.createConnection({ 
    host: "localhost",
    port: 3306,
    user: "root", 
    password: "", 
    database: "romana" 
});

const get_varieties = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT products.name, products.code
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN products ON body.product_code=products.code
            WHERE weights.status='T' AND header.status='I' AND weights.cycle=1 AND
            weights.created > '2021-12-01 00:00:00'
            AND products.type='Uva'
            GROUP BY products.name
            ORDER BY products.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_kilos = product_code => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM(body.kilos) AS kilos
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            WHERE weights.status='T' AND header.status='I' AND weights.cycle=1 AND
            body.status='T' AND weights.created > '2021-12-01 00:00:00'
            AND body.product_code='${product_code}';
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);
            return resolve(results[0].kilos);
        })
    })
}

(async () => {
    try {

        const varieties = await get_varieties();

        let total = 0;
        for (let i = 0; i < varieties.length; i++) {
            varieties[i].kilos = await get_kilos(varieties[i].code);
            total += varieties[i].kilos
        }

        varieties.sort((a, b) => b.kilos - a.kilos);
        console.table(varieties)
        //console.log(total)

        //console.log(JSON.stringify(varieties))
    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();