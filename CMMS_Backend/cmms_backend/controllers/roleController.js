const pool = require("../db");

const getRoles = async (req, res) => {
  try {
    const roles = await pool.query("SELECT * FROM roles ORDER BY id");
    res.json(roles.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const newRole = await pool.query("INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *", [name.toLowerCase(), description]);
    res.status(201).json(newRole.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const updated = await pool.query("UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *", [name.toLowerCase(), description, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteRole = async (req, res) => {
  try {
    await pool.query("DELETE FROM roles WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Cannot delete role in use." });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole
};
