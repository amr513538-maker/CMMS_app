const pool = require("../db");

const getDepartments = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM departments ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "الاسم مطلوب" });
    const result = await pool.query("INSERT INTO departments (name) VALUES ($1) RETURNING *", [name.trim()]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "هذا القسم موجود بالفعل" });
    res.status(500).json({ error: "Server Error" });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "الاسم مطلوب" });
    const result = await pool.query(
      "UPDATE departments SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "القسم غير موجود" });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "هذا القسم موجود بالفعل" });
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM departments WHERE id = $1", [id]);
    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: "لا يمكن حذف قسم مرتبط بمستخدمين" });
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
