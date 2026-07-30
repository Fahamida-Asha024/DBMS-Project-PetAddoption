const pool = require('../config/db');

async function getPets(req, res) {
  try {
    const { search, type, breed, status } = req.query;
    let sql = 'SELECT * FROM pets WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR breed LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (breed) { sql += ' AND breed = ?'; params.push(breed); }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    sql += ' ORDER BY id DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch pets' });
  }
}

async function getPetById(req, res) {
  try {
    const [pets] = await pool.query('SELECT * FROM pets WHERE id = ?', [req.params.id]);
    if (!pets[0]) return res.status(404).json({ message: 'Pet not found' });

    const [vax] = await pool.query(
      'SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY date_administered DESC',
      [req.params.id]
    );

    res.json({ ...pets[0], vaccinations: vax });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch pet' });
  }
}

async function createPet(req, res) {
  try {
    const { name, type, breed, age, gender, status } = req.body;
    if (!name || !type || !breed || age === undefined || !gender) {
      return res.status(400).json({ message: 'Missing required pet fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO pets (name, type, breed, age, gender, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, breed, age, gender, status || 'Available']
    );

    const [rows] = await pool.query('SELECT * FROM pets WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create pet' });
  }
}

async function updatePet(req, res) {
  try {
    const { name, type, breed, age, gender, status } = req.body;
    const [existing] = await pool.query('SELECT * FROM pets WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Pet not found' });

    await pool.query(
      `UPDATE pets SET name=?, type=?, breed=?, age=?, gender=?, status=? WHERE id=?`,
      [
        name ?? existing[0].name,
        type ?? existing[0].type,
        breed ?? existing[0].breed,
        age ?? existing[0].age,
        gender ?? existing[0].gender,
        status ?? existing[0].status,
        req.params.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM pets WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update pet' });
  }
}

async function deletePet(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM pets WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Pet not found' });
    res.json({ message: 'Pet deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete pet' });
  }
}

module.exports = { getPets, getPetById, createPet, updatePet, deletePet };
