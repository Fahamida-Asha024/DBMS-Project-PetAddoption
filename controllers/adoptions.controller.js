const pool = require('../config/db');
async function getAdoptions(req, res) {
  try {
    const { status } = req.query;
    let sql = `
      SELECT a.*, p.name AS pet_name, p.type AS pet_type, p.breed AS pet_breed,
             ad.name AS adopter_name, ad.phone AS adopter_phone, ad.email AS adopter_email,
             s.name AS staff_name
      FROM adoptions a
      JOIN pets p ON p.id = a.pet_id
      JOIN adopters ad ON ad.id = a.adopter_id
      LEFT JOIN users s ON s.id = a.assigned_staff_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    sql += ' ORDER BY a.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch adoptions' });
  }
}
async function getMyAdoptions(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.status, a.delivery_status, a.created_at, a.approval_date,
             p.name AS pet_name, p.breed AS pet_breed, s.name AS staff_name
      FROM adoptions a
      JOIN pets p ON p.id = a.pet_id
      JOIN adopters ad ON ad.id = a.adopter_id
      LEFT JOIN users s ON s.id = a.assigned_staff_id
      WHERE ad.user_id = ?
      ORDER BY a.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch your adoption history' });
  }
}


async function getAssignedToMe(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.delivery_status, a.approval_date,
             p.name AS pet_name, p.breed AS pet_breed,
             ad.name AS adopter_name, ad.phone AS adopter_phone, ad.address AS adopter_address
      FROM adoptions a
      JOIN pets p ON p.id = a.pet_id
      JOIN adopters ad ON ad.id = a.adopter_id
      WHERE a.assigned_staff_id = ?
      ORDER BY a.approval_date DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch your assigned deliveries' });
  }
}
async function createAdoption(req, res) {
  const conn = await pool.getConnection();
  try {
    const { petId } = req.body;
    if (!petId) { conn.release(); return res.status(400).json({ message: 'petId is required' }); }

    await conn.beginTransaction();

    let [adopterRows] = await conn.query('SELECT * FROM adopters WHERE user_id = ?', [req.user.id]);
    let adopterId;
    if (adopterRows[0]) {
      adopterId = adopterRows[0].id;
    } else {
      const [userRows] = await conn.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
      const u = userRows[0];
      const [ins] = await conn.query(
        'INSERT INTO adopters (user_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
        [u.id, u.name, u.phone || '', u.email, u.address || '']
      );
      adopterId = ins.insertId;
    }

    const [petRows] = await conn.query('SELECT * FROM pets WHERE id = ? FOR UPDATE', [petId]);
    if (!petRows[0]) { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Pet not found' }); }
    if (petRows[0].status !== 'Available') {
      await conn.rollback(); conn.release();
      return res.status(409).json({ message: 'This pet is not available for adoption' });
    }

    const [result] = await conn.query(
      `INSERT INTO adoptions (pet_id, adopter_id, adoption_date, status) VALUES (?, ?, CURDATE(), 'pending')`,
      [petId, adopterId]
    );
    await conn.query(`UPDATE pets SET status = 'Pending' WHERE id = ?`, [petId]);

    await conn.query(
      `INSERT INTO notifications (recipient_role, message, related_adoption_id)
       VALUES ('admin', ?, ?)`,
      [`New adoption request for "${petRows[0].name}" needs your review.`, result.insertId]
    );

    await conn.commit();
    res.status(201).json({ message: 'Adoption request submitted — status: pending', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to submit adoption request' });
  } finally {
    conn.release();
  }
}

async function approveAdoption(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM adoptions WHERE id = ?', [req.params.id]);
    if (!rows[0]) { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Request not found' }); }

    await conn.query(`UPDATE adoptions SET status = 'approved', approval_date = NOW() WHERE id = ?`, [req.params.id]);
    await conn.query(`UPDATE pets SET status = 'Adopted' WHERE id = ?`, [rows[0].pet_id]);

    await conn.commit();
    res.json({ message: 'Adoption approved — pet marked Adopted' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to approve adoption' });
  } finally {
    conn.release();
  }
}
async function rejectAdoption(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM adoptions WHERE id = ?', [req.params.id]);
    if (!rows[0]) { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Request not found' }); }

    await conn.query(`UPDATE adoptions SET status = 'rejected' WHERE id = ?`, [req.params.id]);
    await conn.query(`UPDATE pets SET status = 'Available' WHERE id = ?`, [rows[0].pet_id]);

    await conn.commit();
    res.json({ message: 'Adoption request rejected' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to reject adoption' });
  } finally {
    conn.release();
  }
}

async function assignStaff(req, res) {
  try {
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ message: 'staffId is required' });

    const [staffRows] = await pool.query('SELECT * FROM users WHERE id = ? AND role = "staff"', [staffId]);
    if (!staffRows[0]) return res.status(404).json({ message: 'Staff member not found' });

    await pool.query(
      `UPDATE adoptions SET assigned_staff_id = ?, delivery_status = 'assigned' WHERE id = ?`,
      [staffId, req.params.id]
    );
    await pool.query(
      `INSERT INTO notifications (recipient_role, recipient_id, message, related_adoption_id)
       VALUES ('staff', ?, 'You have been assigned a new pet delivery.', ?)`,
      [staffId, req.params.id]
    );

    res.json({ message: `Assigned to ${staffRows[0].name} for delivery` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to assign staff' });
  }
}

async function markDelivered(req, res) {
  try {
    const [result] = await pool.query(
      `UPDATE adoptions SET delivery_status = 'delivered' WHERE id = ? AND assigned_staff_id = ?`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ message: 'This delivery is not assigned to you' });
    }
    res.json({ message: 'Marked as delivered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update delivery status' });
  }
}

module.exports = {
  getAdoptions, getMyAdoptions, getAssignedToMe,
  createAdoption, approveAdoption, rejectAdoption, assignStaff, markDelivered,
};