const pool = require("../db");

const getAuditLogs = async (req, res) => {
  try {
    const logs = await pool.query(
      `SELECT a.*, u.full_name as actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC LIMIT 200`
    );
    res.json(logs.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

module.exports = { getAuditLogs };
