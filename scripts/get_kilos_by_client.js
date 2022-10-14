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

const thousand_separator = num => { 
	return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') 
}

const get_varieties = client => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT products.code, products.name AS product
            FROM documents_body body 
            INNER JOIN products ON body.product_code=products.code
            INNER JOIN documents_header header ON body.document_id=header.id 
            INNER JOIN weights ON header.weight_id=weights.id 
            INNER JOIN entities ON header.client_entity=entities.id 
            WHERE weights.cycle=1 AND weights.status='T' AND (header.status='I' OR header.status='T') AND weights.kilos_breakdown=1
            AND (body.status='I' OR body.status='T') AND entities.name LIKE '%${client}%' AND weights.created > '2021-12-01 00:00:00'
            GROUP BY products.name;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results)
        })
    })
}

const get_kilos = (client, product) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM(body.kilos) AS kilos
            FROM documents_body body
            INNER JOIN documents_header header ON body.document_id=header.id
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.cycle=1 AND weights.status='T' AND weights.created > '2021-12-01 00:00:00' AND weights.kilos_breakdown=1
            AND (header.status='T' OR header.status='I') AND (body.status='T' OR body.status='I') 
            AND entities.name LIKE '%${client}%' AND body.product_code='${product}';
        `, (error, results, fields) => {
            if (error) return reject(error);
            total += results[0].kilos;
            return resolve(thousand_separator(results[0].kilos));
        })
    })
}


let total = 0;

(async () => {
    try {

        const client = 'NARANJA';
        const products = await get_varieties(client);

        for (let i = 0; i < products.length; i++) {
            products[i].kilos = await get_kilos(client, products[i].code)
        }
        
        products.push({ code: 'TOTAL', product: 'SUMA TOTAL', kilos: thousand_separator(total) })
        console.table(products)

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();