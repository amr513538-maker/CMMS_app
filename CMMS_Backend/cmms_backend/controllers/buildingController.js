const pool = require("../db");

const getBuildings = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM buildings ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching buildings:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const createBuilding = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "اسم المبنى مطلوب" });
    const result = await pool.query("INSERT INTO buildings (name) VALUES ($1) RETURNING *", [name.trim()]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "هذا المبنى موجود بالفعل" });
    console.error("Error creating building:", err.message);
    res.status(500).json({ error: `خطأ في قاعدة البيانات: ${err.message}` });
  }
};

const updateBuilding = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "اسم المبنى مطلوب" });
    const result = await pool.query("UPDATE buildings SET name = $1 WHERE id = $2 RETURNING *", [name.trim(), req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "المبنى غير موجود" });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "هذا الاسم مستخدم بالفعل" });
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteBuilding = async (req, res) => {
  try {
    await pool.query("DELETE FROM buildings WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding
};
