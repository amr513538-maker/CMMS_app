const pool = require("../db");

const getLabs = async (req, res) => {
  try {
    const { building } = req.query;
    let query = `
      SELECT l.*, 
        COALESCE((SELECT COUNT(*) FROM devices d WHERE d.lab_id = l.id), 0)::int AS device_count
      FROM labs l
    `;
    const params = [];
    if (building) {
      query += " WHERE l.building = $1";
      params.push(building);
    }
    query += " ORDER BY l.id DESC";
    const labs = await pool.query(query, params);
    res.json(labs.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const createLab = async (req, res) => {
  try {
    const { name, building, department } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const newLab = await pool.query("INSERT INTO labs (name, building, department) VALUES ($1, $2, $3) RETURNING *", [name, building, department]);
    res.status(201).json(newLab.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const updateLab = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, building, department } = req.body;
    const updated = await pool.query("UPDATE labs SET name = $1, building = $2, department = $3 WHERE id = $4 RETURNING *", [name, building, department, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteLab = async (req, res) => {
  try {
    await pool.query("DELETE FROM labs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  getLabs,
  createLab,
  updateLab,
  deleteLab
};
