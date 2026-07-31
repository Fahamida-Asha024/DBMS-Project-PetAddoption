const pool = require('../config/db');
async function getMyAdopter(req, res) {
  try {
    const [existing] = await pool.query('SELECT * FROM adopters WHERE user_id = ?', [req.user.id]);
    if (existing[0]) {
      return res.json(existing[0]);
    }

    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [result] = await pool.query(
      `INSERT INTO adopters (user_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`,
      [user.id, user.name, user.phone || '', user.email, user.address || '']
    );
    const [rows] = await pool.query('SELECT * FROM adopters WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch or create your adopter profile' });
  }
}
async function getAdopters(req, res) {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM adopters WHERE 1=1';
    const params = [];
    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch adopters' });
  }
}
async function createAdopter(req, res) {
  try {
    const { name, phone, email, address } = req.body;
    if (!name || !phone || !email || !address) {
      return res.status(400).json({ message: 'Missing required adopter fields' });
    }

    const [existing] = await pool.query('SELECT id FROM adopters WHERE email = ?', [email]);

    if (existing.length > 0) {
      await pool.query(
        `UPDATE adopters SET name=?, phone=?, address=? WHERE id=?`,
        [name, phone, address, existing[0].id]
      );
      const [rows] = await pool.query('SELECT * FROM adopters WHERE id = ?', [existing[0].id]);
      return res.status(200).json(rows[0]);
    }

    const [result] = await pool.query(
      `INSERT INTO adopters (name, phone, email, address) VALUES (?, ?, ?, ?)`,
      [name, phone, email, address]
    );

    const [rows] = await pool.query('SELECT * FROM adopters WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to register adopter' });
  }
}

async function updateAdopter(req, res) {
  try {
    const { name, phone, email, address } = req.body;
    const [existing] = await pool.query('SELECT * FROM adopters WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Adopter not found' });

    await pool.query(
      `UPDATE adopters SET name=?, phone=?, email=?, address=? WHERE id=?`,
      [
        name ?? existing[0].name,
        phone ?? existing[0].phone,
        email ?? existing[0].email,
        address ?? existing[0].address,
        req.params.id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM adopters WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update adopter' });
  }
}
async function deleteAdopter(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM adopters WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Adopter not found' });
    res.json({ message: 'Adopter deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete adopter' });
  }
}

module.exports = { getAdopters, getMyAdopter, createAdopter, updateAdopter, deleteAdopter };