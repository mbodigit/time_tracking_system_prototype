const express = require('express');

const routeModules = [
    require('./authRoutes'),
    require('./profileRoutes'),
    require('./timeEntryRoutes'),
    require('./requestRoutes'),
    require('./lookupRoutes'),
    require('./reportRoutes'),
    require('./dashboardRoutes'),
    require('./calendarRoutes'),
    require('./groupRoutes'),
    require('./orgRoutes'),
    require('./employeeAdminRoutes'),
    require('./masterDataRoutes'),
    require('./absenceAdminRoutes'),
    require('./companyRoutes')
];

const router = express.Router();

for (const routeModule of routeModules) {
    router.use(routeModule);
}

module.exports = router;
