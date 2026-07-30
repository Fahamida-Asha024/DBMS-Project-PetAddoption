const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const petsRoutes = require('./routes/pets.routes');
const adoptersRoutes = require('./routes/adopters.routes');
const adoptionsRoutes = require('./routes/adoptions.routes');
const vaccinationsRoutes = require('./routes/vaccinations.routes');
const reportsRoutes = require('./routes/reports.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const staffRoutes = require('./routes/staff.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'Pet Adoption Management System API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/adopters', adoptersRoutes);
app.use('/api/adoptions', adoptionsRoutes);
app.use('/api/vaccinations', vaccinationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/staff', staffRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Pet Adoption API running on http://localhost:${PORT}`));
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));