const pool = require('../config/db');

async function getNotifications(req, res) {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = 'SELECT * FROM notifications WHERE recipient_role = "admin" ORDER BY created_at DESC LIMIT 50';
      params = [];
    } else {
      sql = 'SELECT * FROM notifications WHERE recipient_role = "staff" AND recipient_id = ? ORDER BY created_at DESC LIMIT 50';
      params = [req.user.id];
    }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
}

async function markRead(req, res) {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
  res.json({ message: 'Marked as read' });
}

module.exports = { getNotifications, markRead };