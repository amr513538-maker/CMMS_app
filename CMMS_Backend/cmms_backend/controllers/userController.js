const pool = require("../db");
const bcrypt = require("bcryptjs");

const createUser = async (req, res) => {
  try {
    const { full_name, email, password, role, phone, department, job_title } = req.body;

    if (!full_name || full_name.length < 2 || full_name.length > 50) {
      return res.status(400).json({ error: "الاسم يجب أن يكون بين 2 و 50 حرفاً وهو حقل إجباري" });
    }
    if (!/^[\u0621-\u064Aa-zA-Z\s]+$/.test(full_name)) {
      return res.status(400).json({ error: "الاسم يجب أن يحتوي على حروف فقط بدون أرقام أو رموز" });
    }

    const nameCheck = await pool.query("SELECT id FROM users WHERE full_name = $1", [full_name]);
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: "هذا الاسم مستخدم بالفعل، يرجى اختيار اسم آخر" });
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني يجب أن يكون Gmail وينتهي بـ @gmail.com" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 8 أحرف" });
    }
    if (phone) {
      if (!/^\d{8,}$/.test(phone)) {
        return res.status(400).json({ error: "رقم الهاتف يجب أن يتكون من أرقام فقط ولا يقل عن 8 أرقام" });
      }
    }
    if (department && !/^[\u0621-\u064Aa-zA-Z\s]+$/.test(department)) {
      return res.status(400).json({ error: "القسم يجب أن يحتوي على حروف فقط" });
    }
    if (job_title && !/^[\u0621-\u064Aa-zA-Z\s]+$/.test(job_title)) {
      return res.status(400).json({ error: "المسمى الوظيفي يجب أن يحتوي على حروف فقط" });
    }

    let dbRoleName = 'user';
    if (role === 'admin') dbRoleName = 'admin';
    else if (role === 'IT Support') dbRoleName = 'IT Support';
    else if (role !== 'user') return res.status(400).json({ error: "الدور والصلاحية غير صحيحة" });

    const passwordHash = await bcrypt.hash(password, 10);

    let roleId = null;
    const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1 LIMIT 1", [dbRoleName]);
    if (roleRes.rows.length > 0) roleId = roleRes.rows[0].id;

    const newUserRes = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role_id, phone, department, job_title, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id",
      [full_name, email, passwordHash, roleId, phone || null, department || null, job_title || null]
    );

    const insertedId = newUserRes.rows[0].id;
    const fullUser = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.department, u.job_title, r.name AS role, u.is_active, u.created_at
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [insertedId]
    );

    res.status(201).json(fullUser.rows[0]);
  } catch (err) {
    console.error("Error creating user:", err.message);
    if (err.code === '23505') return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
    res.status(500).json({ error: "Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, password, role, phone, department, job_title } = req.body;

    if (!full_name || full_name.length < 2 || full_name.length > 50) {
      return res.status(400).json({ error: "الاسم يجب أن يكون بين 2 و 50 حرفاً وهو حقل إجباري" });
    }
    if (!/^[\u0621-\u064Aa-zA-Z\s]+$/.test(full_name)) {
      return res.status(400).json({ error: "الاسم يجب أن يحتوي على حروف فقط بدون أرقام أو رموز" });
    }

    const nameCheck = await pool.query("SELECT id FROM users WHERE full_name = $1 AND id != $2", [full_name, id]);
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: "هذا الاسم مستخدم بالفعل لمستخدم آخر" });
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني يجب أن يكون Gmail وينتهي بـ @gmail.com" });
    }
    if (password && password.trim() !== "") {
      if (password.length < 8) return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 8 أحرف" });
    }
    if (phone) {
      if (!/^\d{8,}$/.test(phone)) {
        return res.status(400).json({ error: "رقم الهاتف يجب أن يتكون من أرقام فقط ولا يقل عن 8 أرقام" });
      }
    }
    if (department && !/^[\u0621-\u064Aa-zA-Z\s]+$/.test(department)) {
      return res.status(400).json({ error: "القسم يجب أن يحتوي على حروف فقط" });
    }
    if (job_title && !/^[\u0621-\u064Aa-zA-Z\s]+$/.test(job_title)) {
      return res.status(400).json({ error: "المسمى الوظيفي يجب أن يحتوي على حروف فقط" });
    }

    let dbRoleName = 'user';
    if (role === 'admin') dbRoleName = 'admin';
    else if (role === 'IT Support') dbRoleName = 'IT Support';
    else if (role !== 'user') return res.status(400).json({ error: "الدور والصلاحية غير صحيحة" });

    let roleId = null;
    const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1 LIMIT 1", [dbRoleName]);
    if (roleRes.rows.length > 0) roleId = roleRes.rows[0].id;

    let passQuery = "";
    let params = [full_name, email, roleId, phone || null, department || null, job_title || null, id];

    if (password && password.trim() !== "") {
      const passwordHash = await bcrypt.hash(password, 10);
      passQuery = ", password_hash = $8";
      params.push(passwordHash);
    }

    const updateRes = await pool.query(
      `UPDATE users
       SET full_name = $1, email = $2, role_id = $3, phone = $4, department = $5, job_title = $6 ${passQuery}, updated_at = NOW()
       WHERE id = $7
       RETURNING id`,
      params
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const updatedUser = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.department, u.job_title, r.name AS role, u.is_active, u.created_at
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error("Error updating user:", err.message);
    if (err.code === '23505') return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً لمستخدم آخر" });
    res.status(500).json({ error: "Server Error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const allUsers = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.department, u.job_title, r.name AS role, u.is_active, u.created_at
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       ORDER BY u.id DESC`
    );
    res.json(allUsers.rows);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const getITSupport = async (req, res) => {
  try {
    const techs = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE (r.name = 'IT Support' OR r.name = 'technician') AND u.is_active = TRUE
       ORDER BY u.full_name ASC`
    );
    res.json(techs.rows);
  } catch (err) {
    console.error("Error fetching technicians:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteUsersBatch = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "عليك اختيار مستخدم واحد على الأقل" });
    }

    const idList = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (idList.length === 0) return res.status(400).json({ error: "Invalid IDs" });

    const checkingAdmins = await pool.query(`SELECT email FROM users WHERE id = ANY($1::bigint[])`, [idList]);
    for (const row of checkingAdmins.rows) {
      if (row.email === 'admin@cmms.local' || row.email === 'admin') {
        return res.status(403).json({ error: "لا يمكن حذف الـ Admin الرئيسي من النظام" });
      }
    }

    await pool.query(`DELETE FROM users WHERE id = ANY($1::bigint[])`, [idList]);

    res.json({ success: true, message: `تم حذف ${idList.length} مستخدم` });
  } catch (err) {
    console.error("Error deleting users:", err.message);
    if (err.code === '23503') {
      return res.status(409).json({ error: "لا يمكن حذف مستخدمين مرتبطين بطلبات صيانة. يرجى تعديلهم بدلاً من الحذف." });
    }
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query("SELECT email FROM users WHERE id = $1", [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "المستخدم غير موجود" });

    const email = check.rows[0].email;
    if (email === 'admin@cmms.local' || email === 'admin') {
      return res.status(403).json({ error: "لا يمكن حذف الـ Admin الرئيسي من النظام" });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true, message: "تم حذف المستخدم بنجاح" });
  } catch (err) {
    console.error("Error deleting user:", err.message);
    if (err.code === '23503') {
      return res.status(409).json({ error: "لا يمكن حذف هذا المستخدم لارتباطه بطلبات صيانة أو سجلات تتبع." });
    }
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  createUser,
  updateUser,
  getAllUsers,
  getITSupport,
  deleteUsersBatch,
  deleteUser
};
