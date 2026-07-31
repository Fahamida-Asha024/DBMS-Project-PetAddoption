const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function listStaff(req, res) {
  const [rows] = await pool.query('SELECT id, name, username, email, phone FROM users WHERE role = "staff"');
  res.json(rows);
}

async function createStaff(req, res) {
  try {
    const { username, password, name, email, phone } = req.body;
    if (!username || !password || !name || !email) {
      return res.status(400).json({ message: 'username, password, name and email are required' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) return res.status(409).json({ message: 'Username or email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, role, name, email, phone) VALUES (?, ?, 'staff', ?, ?, ?)`,
      [username, hash, name, email, phone || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Staff account created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create staff account' });
  }
}

module.exports = { listStaff, createStaff };