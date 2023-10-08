"use strict";

const mysql = require('mysql');

const conn = mysql.createConnection({ 
    host: "192.168.1.90",
    port: 3306,
    user: "dte", 
    password: "m1Ks3DVIAS28h7dt", 
    database: "romana" 
});

/*
const conn = mysql.createConnection({ 
    host: "172.25.80.141",
    port: 3306,
    user: "marcos", 
    password: "M@r$l1985_:)", 
    database: "romana" 
});
*/

const get_docs = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.weight_id, header.id AS doc_id, header.number, body.id AS body_id,
            body.product_code, body.price, body.kilos, container_code,
            container_amount
            FROM documents_header header
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN weights ON header.weight_id=weights.id
            WHERE weights.status <> 'N' AND header.status='I' AND body.status <> 'N'
            ORDER BY header.weight_id ASC, header.id ASC, body.id ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);

            const documents = [], docs_id = [];

            for (let row of results) {

                if (docs_id.includes(row.doc_id)) continue;
                docs_id.push(row.doc_id);

                const document = {
                    id: row.doc_id,
                    weight_id: row.weight_id,
                    number: row.number,
                    rows: []
                }

                for (let doc of results) {
                    if (doc.doc_id !== row.doc_id) continue;
                    document.rows.push({
                        id: doc.body_id,
                        product: {
                            code: doc.product_code,
                            price: doc.price,
                            kilos: doc.kilos
                        },
                        container: {
                            code: doc.container_code,
                            amount: doc.container_amount
                        }
                    });
                }

                documents.push(document);
            }

            return resolve(documents);
        })
    })
}

const change_doc_status_to_sale = doc_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE documents_header SET type=2 WHERE id=${doc_id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

(async () => {

    try {
        const docs = await get_docs();

        console.log(docs.length)

        for (let doc of docs) {

            let constitutes_sale = false;
    
            for (let row of doc.rows) {

                if (row.product.code !== null && row.product.price !== null) {
                    constitutes_sale = true;
                    break;
                }
            }
    
            if (constitutes_sale) await change_doc_status_to_sale(doc.id);
    
        }

        console.log('finished!!')
    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();