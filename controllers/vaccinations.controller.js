const pool = require('../config/db');

async function getVaccinations(req, res) {
  try {
    const { petId } = req.query;
    let sql = `
      SELECT v.*, p.name AS pet_name
      FROM vaccinations v JOIN pets p ON p.id = v.pet_id
      WHERE 1=1
    `;
    const params = [];
    if (petId) { sql += ' AND v.pet_id = ?'; params.push(petId); }
    sql += ' ORDER BY v.next_due_date ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch vaccinations' });
  }
}

async function createVaccination(req, res) {
  try {
    const { petId, vaccineName, dateAdministered, nextDueDate } = req.body;
    if (!petId || !vaccineName || !dateAdministered || !nextDueDate) {
      return res.status(400).json({ message: 'Missing required vaccination fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO vaccinations (pet_id, vaccine_name, date_administered, next_due_date)
       VALUES (?, ?, ?, ?)`,
      [petId, vaccineName, dateAdministered, nextDueDate]
    );

    const [rows] = await pool.query('SELECT * FROM vaccinations WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add vaccination record' });
  }
}

async function updateVaccination(req, res) {
  try {
    const { vaccineName, dateAdministered, nextDueDate } = req.body;
    const [existing] = await pool.query('SELECT * FROM vaccinations WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Vaccination record not found' });

    await pool.query(
      `UPDATE vaccinations SET vaccine_name=?, date_administered=?, next_due_date=? WHERE id=?`,
      [
        vaccineName ?? existing[0].vaccine_name,
        dateAdministered ?? existing[0].date_administered,
        nextDueDate ?? existing[0].next_due_date,
        req.params.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM vaccinations WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update vaccination record' });
  }
}

// DELETE /api/vaccinations/:id  (staff/manager only)
async function deleteVaccination(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM vaccinations WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Vaccination record not found' });
    res.json({ message: 'Vaccination record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete vaccination record' });
  }
}

module.exports = { getVaccinations, createVaccination, updateVaccination, deleteVaccination };
