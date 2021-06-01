var mysql = require('mysql2');

if(process.env.NODE_ENV === 'production'){
    pool = mysql.createPool({
        host     :process.env.DB_HOST,
        port     :process.env.DB_PORT,
        user     :process.env.DB_USER,
        password :process.env.DB_PASSWORD,
        database :process.env.DB_DATABASE,
        insecureAuth : true,
        multipleStatements: true
    })
} else {
    pool = mysql.createPool({
        host     : 'localhost',
        port     :'3306',
        user     :'ankit',
        password : 'ankit',
        database : 'test',
        insecureAuth : true,
        multipleStatements: true
    })
}

module.exports = pool