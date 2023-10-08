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
    host: "localhost",
    port: 3306,
    user: "root", 
    password: "", 
    database: "romana" 
});
*/

const global = {}

const todays_date = () => {
    const 
    now = new Date(),
    year = now.getFullYear(),
    month = (now.getMonth() + 1 < 10) ? '0' + (now.getMonth() + 1) : now.getMonth() + 1,
    day = (now.getDate() < 10) ? '0' + now.getDate() : now.getDate(),
    hour = now.toLocaleString('es-CL').split(' ')[1];
    return year + '-' + month + '-' + day + ' ' + hour;
}

const get_current_season = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT id, beginning, ending FROM seasons ORDER BY id DESC LIMIT 1;
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);

            return resolve({
                start: results[0].beginning.toISOString().split('T')[0] + ' 00:00:00',
                end: (results[0].ending === null) ? todays_date() : results[0].ending.toLocaleString('es-CL').split(' ')[0]
            });
        })
    })
}

const get_finished_weights = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.id AS weight_id, weights.final_net_weight, header.id AS doc_id, body.kilos
            FROM weights
            INNER JOIN documents_header header ON weights.id=header.weight_id
            INNER JOIN documents_body body ON header.id=body.document_id
            WHERE (weights.created BETWEEN '${global.season.start}' AND '${global.season.end}')
            AND (header.created BETWEEN '${global.season.start}' AND '${global.season.end}')
            AND weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I')
            AND weights.final_net_weight IS NOT NULL AND header.document_total IS NOT NULL
            ORDER BY weights.id ASC, header.id ASC, body.id ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);

            const weights = [];
            let current_weight;
            
            for (let i = 0; i < results.length; i++) {

                if (results[i].weight_id === current_weight) continue;
                current_weight = results[i].weight_id;

                const weight = {
                    id: results[i].weight_id,
                    documents: [],
                    kilos: results[i].final_net_weight
                }

                let current_doc;
                for (let j = i; j < results.length; j++) {
                    
                    if (weight.id !== results[j].weight_id) break;
                    if (current_doc === results[j].doc_id) continue;
                    current_doc = results[j].doc_id;

                    const document = {
                        id: results[j].doc_id,
                        rows: []
                    }

                    for (let k = j; k < results.length; k++) {
                        if (document.id !== results[k].doc_id) break;
                        document.rows.push({
                            kilos: 1 * results[k].kilos
                        })
                    }

                    weight.documents.push(document)
                }
                weights.push(weight);
            }

            return resolve(weights);
        })
    })
}

(async () => {

    try {

        global.season = await get_current_season();
        const weights = await get_finished_weights();

        for (const weight of weights) {
            
            const total_kilos = weight.kilos;

            let kilos = 0;
            for (const document of weight.documents) {
                for (const row of document.rows) {
                    kilos += row.kilos;
                }                
            }

            if (total_kilos !== kilos) 
                console.log(`\r\nKilos breakdown in weight Nº ${weight.id} don't match.\r\nKilos in weight are: ${total_kilos}\r\nKilos in body are: ${kilos}\r\nDiference is: ${total_kilos - kilos}\r\n`);

        }

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();