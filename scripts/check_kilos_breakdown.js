const UserInput = require('wait-for-user-input');
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

const get_weights = client => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.created, weights.id, weights.cycle, weights.primary_plates, drivers.name AS driver, 
            weights.gross_net, weights.tare_net, weights.final_net_weight
            FROM weights
            INNER JOIN drivers ON weights.driver_id=drivers.id
            INNER JOIN documents_header header ON weights.id=header.weight_id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T' AND (header.status='I' OR header.status='T') AND weights.cycle <> 4
            AND weights.created > '2021-12-01 00:00:00' AND weights.final_net_weight IS NOT NULL
            AND weights.final_net_weight > 0;
        `, async (error, results, fields) => {
            if (error) return reject(error);

            console.log(results.length)
            const weights = [];
            for (let i = 0; i < results.length; i++) {

                const weight = { 
                    id: results[i].id,
                    cycle: results[i].cycle,
                    created: new Date(results[i].created).toLocaleString('es-CL'),
                    plates: results[i].primary_plates,
                    driver: results[i].driver,
                    gross_net: results[i].gross_net,
                    tare_net: results[i].tare_net,
                    final_net_weight: results[i].final_net_weight
                }
                
                weight.documents = await get_documents(weight.id);
                for (let j = 0; j < weight.documents.length; j++) {
                    weight.documents[j].rows = await get_rows(weight.documents[j].id);
                }

                weights.push(weight);
            }

            return resolve(weights);
        })
    })
}

const get_documents = weight_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.id, header.created, header.number, header.date, entities.name AS client
            FROM documents_header header
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE header.status='I' AND header.weight_id=${parseInt(weight_id)};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_rows = doc_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT body.id, products.name AS product, body.cut, body.price, body.kilos, body.informed_kilos, 
            containers.name AS container, body.container_amount
            FROM documents_body body 
            INNER JOIN products ON body.product_code=products.code
            INNER JOIN containers ON body.container_code=containers.code
            WHERE (body.status='T' OR body.status='I') AND body.product_code IS NOT NULL 
            AND body.document_id=${parseInt(doc_id)}
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

(async () => {
    try {

        /*
        let client = '';
        while (client.length === 0) { client = await UserInput('Ingresa el nombre del cliente:\r\n') }

        const weights = await get_weights(client);
        */

        const weights = await get_weights();

        /*
        for (let i = 0; i < weights.length; i++) {
            if (weights[i].id === 27686) {
                console.log(weights[i])
                for (let j = 0; j < weights[i].documents.length; j++) {
                    console.log(weights[i].documents[j])
                }
            }
        }
        */

        for (let i = 0; i < weights.length; i++) {

            const weight_id = weights[i].id;
            const net = weights[i].final_net_weight;
            let breakdown_sum = 0;

            const documents = weights[i].documents;

            for (let j = 0; j < documents.length; j++) {

                const rows = documents[j].rows;
                for (let k = 0; k < rows.length; k++) {
                    breakdown_sum += rows[k].kilos;
                }

            }

            if (net !== breakdown_sum) console.log(weight_id, weights[i].cycle, weights[i].created, net, breakdown_sum);

        }
        
        console.log('finished')

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();