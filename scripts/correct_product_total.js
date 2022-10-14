const mysql = require('mysql');

/*
const conn = mysql.createConnection({ 
    host: "192.168.1.90",
    port: 3306,
    user: "dte", 
    password: "m1Ks3DVIAS28h7dt", 
    database: "romana" 
});
*/
const conn = mysql.createConnection({ 
    host: "localhost",
    port: 3306,
    user: "root", 
    password: "", 
    database: "romana" 
});


const get_null_rows = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.cycle, body.id, body.price, body.kilos, body.informed_kilos
            FROM documents_body body
            INNER JOIN documents_header header ON body.document_id=header.id
            INNER JOIN weights ON header.weight_id=weights.id
            WHERE weights.status='T' AND header.status='I' AND body.status <> 'N'
            AND body.product_total IS NULL AND body.product_code IS NOT NULL AND body.price IS NOT NULL AND
            (body.kilos IS NOT NULL OR body.informed_kilos IS NOT NULL) AND weights.created > '2021-12-01 00:00:00'
            ORDER BY body.id ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const update_row = (row) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE documents_body
            SET product_total=${row.product_total}
            WHERE id=${row.id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

(async () => {
    try {

        const null_rows = await get_null_rows();
        for (let row of null_rows) {
            row.product_total = (row.cycle === 1) ? row.price * row.informed_kilos : row.price * row.kilos;
            await update_row(row);
        }
        console.log('finished');
    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();