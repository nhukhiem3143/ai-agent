const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
    host: process.env.DB_HOST || 'mysql_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'generator_db',
    waitForConnections: true,
    connectionLimit: 10,
});