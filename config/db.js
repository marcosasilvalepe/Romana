const mysql = require('mysql');
//const conn = mysql.createPool({ connectionLimit: 15, host: "localhost", user: "root", password: "", database: "romana" });

//DELETE AFTERWARDS -> MULTIPLE STATEMENTS LEADS TO SQL INJECTION!!!!
const conn = mysql.createPool({ 
    connectionLimit: 15, 
    host: "localhost", 
    user: "root", 
    password: "M@r$l1985_:)", 
    database: "romana", 
    multipleStatements: true 
});

module.exports = conn;