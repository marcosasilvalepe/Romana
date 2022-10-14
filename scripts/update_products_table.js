const mysql = require('mysql');
const conn = mysql.createPool({ connectionLimit: 15, host: "localhost", user: "root", password: "", database: "romana", multipleStatements: true });

const get_records = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT body.id, body.product_code, products.name
            FROM documents_body body
            INNER JOIN products ON body.product_code=products.code
            WHERE body.product_code IS NOT NULL
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const update_table = (id, description) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE documents_body
            SET product_description='${description}'
            WHERE id=${id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}


(async () => {
    try {
        const records = await get_records();
        for (let i = 0; i < records.length; i++) {
            await update_table(records[i].id, records[i].name);
        }
    } 
    catch(e) { console.log(e) }
    finally { process.exit() }
})();