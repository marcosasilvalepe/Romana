"use strict";

const mysql = require('mysql');

const conn = mysql.createConnection({ 
    host: "192.168.1.90",
    port: 3306,
    user: "dte", 
    password: "m1Ks3DVIAS28h7dt", 
    database: "romana" 
});

const DATE = '2023-01-01 00:00:00';

const get_entities = cycle => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT entities.id, entities.name, entities.billing_type
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T' AND header.status='I'
            AND header.type=2 AND weights.cycle=${cycle} AND weights.created > '${DATE}'
            GROUP BY entities.id
            ORDER BY entities.id ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_entity_total = (id, field, cycle) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM(body.price * body.${field}) AS total
            FROM documents_header header
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I')
            AND header.client_entity=${id} AND weights.cycle=${cycle} AND body.product_code IS NOT NULL AND header.type=2
            AND weights.created > '${DATE}';
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results[0].total);
        })
    })
}


const get_documents = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.weight_id, header.id AS doc_id, entities.name AS entity, entities.billing_type, header.document_total,
            body.product_code, body.cut, body.price, body.kilos, body.informed_kilos
            FROM documents_header header
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I')
            AND body.product_code IS NOT NULL AND header.type=2 AND weights.final_net_weight IS NOT NULL
            AND weights.final_net_weight > 0 AND weights.created > '${DATE}'
            ORDER BY header.id ASC, body.id ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);

            const documents = [];

            let current_doc;
            for (let i = 0; i < results.length; i++) {

                if (current_doc === results[i].doc_id) continue;
                current_doc = results[i].doc_id;

                const document = {
                    id: results[i].doc_id,
                    weight_id: results[i].weight_id,
                    entity: results[i].entity,
                    total: 0,
                    db_total: results[i].document_total
                }
                documents.push(document);

                for (let j = i; j < results.length; j++) {
                    if (document.id !== results[j].doc_id) break;
                    document.total += (results[j].billing_type === 0) ? (results[j].price * results[j].informed_kilos) : (results[j].price * results[j].kilos);
                }

                if (document.total !== document.db_total) console.log(document)

            }

            return resolve(documents);
        })
    })
}

const sum_totals = () => {
    return new Promise(async (resolve, reject) => {
        try {

            const entities = await get_entities(1);

            let total = 0;

            for (const entity of entities) {

                const kilos_field = (entity.billing_type === 0) ? 'informed_kilos' : 'kilos';
                const entity_total = await get_entity_total(entity.id, kilos_field, 1);

                //console.log(`Total for ${entity.name} is ${entity_total}`);

                total += entity_total;

            }

            console.log(parseInt(1.19 * total));

            return resolve();

        } catch(e) { return reject(e) }
    })
}

const update_document_total = document => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE documents_header 
            SET document_total=${parseInt(document.total)}
            WHERE id=${document.id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

const correct_totals = () => {
    return new Promise(async (resolve, reject) => {
        try {

            const documents = await get_documents();

            console.log(`${documents.length} documents to update`);
            
            for (const document of documents) {

                await update_document_total(document);

            }

            return resolve();
        } catch(e) { return reject(e) }
    })
}


(async () => {
    try {

        await sum_totals();
        await correct_totals();
        

        console.log('finished!!!')

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();