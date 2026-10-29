require('dotenv').config({ quite: true});
const express = require('express');
const pool = require('./src/config/db');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const timeEntryRoutes = require('./src/routes/timeEntryRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const lookupRoutes = require('./src/routes/lookupRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const calendarRoutes = require('./src/routes/calendarRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const orgRoutes = require('./src/routes/orgRoutes');
const employeeAdminRoutes = require('./src/routes/employeeAdminRoutes');
const masterDataRoutes = require('./src/routes/masterDataRoutes');
const absenceAdminRoutes = require('./src/routes/absenceAdminRoutes');

const app = express();


app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', timeEntryRoutes);
app.use('/api', requestRoutes);
app.use('/api', lookupRoutes);
app.use('/api', reportRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', calendarRoutes);
app.use('/api', groupRoutes);
app.use('/api', orgRoutes);
app.use('/api', employeeAdminRoutes);
app.use('/api', masterDataRoutes);
app.use('/api', absenceAdminRoutes);

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