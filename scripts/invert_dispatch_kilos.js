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
    host: "localhost",
    port: 3306,
    user: "root", 
    password: "", 
    database: "romana" 
});
*/

const get_weights = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.id, weights.primary_plates, weights.final_net_weight
            FROM weights
            INNER JOIN documents_header header ON weights.id=header.weight_id
            WHERE weights.cycle=2 AND weights.status='T' AND weights.created > '2021-12-01 00:00:00' 
            AND weights.final_net_weight IS NOT NULL AND weights.final_net_weight > 0 AND header.status='I';
        `, (error, results, fields) => {
            if (error) return reject(error);

            const weights = [];

            for (let i = 0; i < results.length; i++) {

                const weight = {
                    id: results[i].id,
                    plates: results[i].primary_plates,
                    final_net_weight: results[i].final_net_weight
                }

                weights.push(weight)

            }

            return resolve(weights);
        })
    })
}

const get_documents = weight_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.id, header.created, header.number, entities.name AS entity
            FROM documents_header header
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE header.weight_id=${weight_id} AND header.status='I'
        `, async (error, results, fields) => {
            if (error || results.length === 0) return reject(error);

            const docs = [];
            for (let i = 0; i < results.length; i++) {
                
                const doc = {
                    id: results[i].id,
                    created: results[i].created,
                    number: results[i].number,
                    entity: results[i].entity
                }

                doc.rows = await get_document_rows(doc.id);
                docs.push(doc)
                
            }

            return resolve(docs);
        })
    })
}

const get_document_rows = doc_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT body.id, body.product_code, body.kilos, body.informed_kilos, containers.name AS container_name, body.container_amount
            FROM documents_body body
            INNER JOIN containers ON body.container_code=containers.code
            WHERE body.document_id=${doc_id} AND (body.status='T' OR body.status='I');
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const update_kilos = (row_id, kilos, informed_kilos) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE documents_body SET kilos=${informed_kilos}, informed_kilos=${kilos} WHERE id=${row_id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}


(async () => {

    try {

        const weights = await get_weights();
        
        for (let i = 0; i < weights.length; i++) {

            const documents = await get_documents(weights[i].id);
            weights[i].documents = documents;
            
            for (let j = 0; j < documents.length; j++) {
                
                const rows = documents[j].rows;

                for (let k = 0; k < rows.length; k++) {

                    const
                    row_id = rows[k].id,
                    kilos = rows[k].kilos,
                    informed_kilos = rows[k].informed_kilos;

                    await update_kilos(row_id, kilos, informed_kilos);

                }

            }

        }

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();