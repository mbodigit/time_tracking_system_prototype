require('dotenv').config({ quite: true});
const express = require('express');
const pool = require('./src/config/db');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');

const app = express();


app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);

const serverStart = async () => {
    try {
        await pool.query('SELECT 1')
        const port = process.env.PORT || 3000;
        app.listen(port, () => console.log(`Server is running on port ${port}`));
    }
    catch (error){
        console.error(`Adatbázis kapcsolat hiba: [${error.code}]: ${error.message}`);
        process.exit(1);
    }
}

serverStart();