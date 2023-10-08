const UserInput = require('wait-for-user-input');
const mysql = require('mysql');
const conn = mysql.createConnection({ 
    host: "192.168.1.90",
    port: 3306,
    user: "dte", 
    password: "m1Ks3DVIAS28h7dt", 
    database: "romana" 
});

const get_records = client => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.created, header.weight_id, weights.final_net_weight, header.id AS doc_id, header.number, body.id AS body_id, 
            products.name, body.cut, body.price, body.kilos, body.informed_kilos, containers.name, body.container_weight, 
            body.container_amount
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN products ON body.product_code=products.code
            INNER JOIN containers ON body.container_code=containers.code
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE entities.name LIKE '%NARANJA%' AND weights.kilos_breakdown=0 AND weights.status='T' AND weights.cycle=1 AND
            (header.status='T' OR header.status='I') AND (body.status='T' OR body.status='I') AND body.product_code IS NOT NULL
            ORDER BY header.id ASC, body.id ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_weights = client => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT weights.created, weights.id, weights.primary_plates, drivers.name AS driver, 
            weights.gross_net, weights.tare_net, weights.final_net_weight
            FROM weights
            INNER JOIN drivers ON weights.driver_id=drivers.id
            INNER JOIN documents_header header ON weights.id=header.weight_id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T' AND header.status='I' AND weights.kilos_breakdown=0 AND weights.cycle=1
            AND entities.name LIKE '%${client}%'
        `, async (error, results, fields) => {
            if (error) return reject(error);

            const weights = [];
            for (let i = 0; i < results.length; i++) {

                const weight = { 
                    id: results[i].id,
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
            WHERE (body.status='T' OR body.status='I') AND body.product_code IS NOT NULL AND body.document_id=${parseInt(doc_id)}
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}


(async () => {
    try {


        let client = await UserInput('Ingresa el nombre del cliente:\r\n');
        //while (client.length === 0) { client = await waitForUserInput('Ingresa el nombre del cliente:\r\n') }

        const weights = await get_weights(client);
        
        for (let i = 0; i < weights.length; i++) {
            
            const documents = weights.documents;
            for (let j = 0; j < 1; j++) {

                console.table(documents[j])

            }
            
        }

    } 
    catch(e) { console.log(`Something went wrong. ${e}`) }
    finally { process.exit() }
})();