const mysql = require('mysql2/promise');
module.exports = mysql.createPool({
    host: process.env.DB_HOST || 'mysql_db',
    user: 'root',
    password: '123456',
    database: 'shop_db',
    waitForConnections: true,
});