const Pool = require('pg').Pool;
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: DB_PORT,
    password: process.env.DB_PASSWDORD
})

module.exports = pool;