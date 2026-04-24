const pool = require("../db");

const getUnreadCount = async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false", [req.user.sub]);
    res.json({ count: parseInt(result.rows[0].count) || 0 });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [req.user.sub]);
    res.json(notifications.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const markAsRead = async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [req.params.id, req.user.sub]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const markAllAsRead = async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false", [req.user.sub]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

module.exports = {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead
};
