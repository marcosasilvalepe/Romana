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

const get_records = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.id, weights.cycle
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            WHERE weights.status='T' AND header.status='I' AND weights.created > '2021-12-01 00:00:00'
            AND header.document_total IS NULL
            ORDER BY header.id ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_doc_total = (doc_id, cycle) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM(price * ${(cycle === 1) ? 'informed_kilos' : 'kilos'}) AS doc_total
            FROM documents_body 
            WHERE document_id=${doc_id};
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);
            return resolve(results[0].doc_total)
        })
    })
}

const update_doc_total = (doc_id, doc_total) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE documents_header
            SET document_total=${doc_total}
            WHERE id=${doc_id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

(async () => {
    try {

        const records = await get_records();
        for (let row of records) {
            row.doc_total = await get_doc_total(row.id, row.cycle);
            await update_doc_total(row.id, row.doc_total);
        }
        console.log('finished!!')
    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();