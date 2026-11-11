require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const pool = require('./src/config/db');
const apiRoutes = require('./src/routes');

const API_PREFIX = '/api';
const DEFAULT_PORT = 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(API_PREFIX, apiRoutes);

const startServer = async () => {
    try {
        await pool.query('SELECT 1');

        const port = process.env.PORT || DEFAULT_PORT;

        app.listen(port, () => {
            console.log(`A szerver a ${port} porton fut.`);
        });
    } catch (error) {
        console.error(`Adatbázis kapcsolat hiba: [${error.code}]: ${error.message}`);
        process.exit(1);
    }
};

startServer();
