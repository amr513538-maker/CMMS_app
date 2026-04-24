const pool = require("../db");

const getJobTitles = async (req, res) => {
  try {
    const { department_id } = req.query;
    let result;
    if (department_id) {
      result = await pool.query("SELECT * FROM job_titles WHERE department_id = $1 ORDER BY title ASC", [department_id]);
    } else {
      result = await pool.query("SELECT * FROM job_titles ORDER BY title ASC");
    }
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const createJobTitle = async (req, res) => {
  try {
    const { department_id, title } = req.body;
    if (!department_id || !title) return res.status(400).json({ error: "القسم والمسمى مطلوبان" });
    const result = await pool.query("INSERT INTO job_titles (department_id, title) VALUES ($1, $2) RETURNING *", [department_id, title]);
    res.status(201).json(result.rows[0]);
  } catch (err) { 
    if (err.code === '23505') return res.status(409).json({ error: "هذا المسمى موجود بالفعل في هذا القسم" });
    res.status(500).json({ error: "Server Error" }); 
  }
};

const updateJobTitle = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "المسمى مطلوب" });
    const result = await pool.query(
      "UPDATE job_titles SET title = $1 WHERE id = $2 RETURNING *",
      [title, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "المسمى غير موجود" });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "هذا المسمى موجود بالفعل في هذا القسم" });
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteJobTitle = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM job_titles WHERE id = $1", [id]);
    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: "لا يمكن حذف مسمى مرتبط بمستخدمين" });
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  getJobTitles,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle
};
