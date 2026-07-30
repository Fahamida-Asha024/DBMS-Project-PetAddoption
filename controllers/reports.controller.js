const pool = require('../config/db');

async function getDashboard(req, res) {
  try {
    const [[{ totalPets }]] = await pool.query('SELECT COUNT(*) AS totalPets FROM pets');
    const [[{ available }]] = await pool.query(`SELECT COUNT(*) AS available FROM pets WHERE status = 'Available'`);
    const [[{ adopted }]] = await pool.query(`SELECT COUNT(*) AS adopted FROM pets WHERE status = 'Adopted'`);
    const [[{ totalAdopters }]] = await pool.query('SELECT COUNT(*) AS totalAdopters FROM adopters');
    const [[{ totalAdoptions }]] = await pool.query(
      `SELECT COUNT(*) AS totalAdoptions FROM adoptions WHERE status = 'approved'`
    );

    const [byType] = await pool.query('SELECT type, COUNT(*) AS count FROM pets GROUP BY type');

    const [recent] = await pool.query(`
      SELECT a.adoption_date, p.name AS pet_name, p.type AS pet_type, ad.name AS adopter_name
      FROM adoptions a
      JOIN pets p ON p.id = a.pet_id
      JOIN adopters ad ON ad.id = a.adopter_id
      WHERE a.status = 'approved'
      ORDER BY a.adoption_date DESC LIMIT 5
    `);

    res.json({ totalPets, available, adopted, totalAdopters, totalAdoptions, byType, recentAdoptions: recent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to build dashboard report' });
  }
}

async function getAvailablePets(req, res) {
  try {
    const [rows] = await pool.query(`SELECT * FROM pets WHERE status = 'Available' ORDER BY name`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to build available pets report' });
  }
}

async function getAdoptedPets(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, ad.name AS adopter_name, a.adoption_date
      FROM pets p
      JOIN adoptions a ON a.pet_id = p.id AND a.status = 'approved'
      JOIN adopters ad ON ad.id = a.adopter_id
      WHERE p.status = 'Adopted'
      ORDER BY a.adoption_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to build adopted pets report' });
  }
}

module.exports = { getDashboard, getAvailablePets, getAdoptedPets };