const mysql = require('mysql');
const conn = mysql.createPool({ 
    connectionLimit: 15, 
    host: "localhost", 
    user: "root", 
    password: "myphpadmingp@s$w0ord2021", 
    database: "romana" 
});

const get_files = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT id, version 
            FROM client_file_versions; 
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const update_version = (id, version) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE client_file_versions
            SET version=${version}
            WHERE id=${id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

(async () => {
    try {
        const files = await get_files();
        for (let i = 0; i < files.length; i++) {
            await update_version(files[i].id, files[i].version + 0.01);
        }
    } 
    catch(e) { console.log(e) }
    finally { process.exit() }
})();