const mysql = require('mysql');
//const conn = mysql.createPool({ connectionLimit: 15, host: "localhost", user: "root", password: "", database: "romana" });

//DELETE AFTERWARS -> MULTIPLE STATEMENTS LEADS TO SQL INJECTION!!!!
const conn = mysql.createPool({ connectionLimit: 15, host: "localhost", user: "root", password: "", database: "romana", multipleStatements: true });
module.exports = conn;