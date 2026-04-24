const pool = require("../db");
const bcrypt = require("bcryptjs");
const { signToken } = require("../utils/jwt");

// --- Email/Password Login ---
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, u.avatar_url, u.phone, u.department, u.job_title, u.created_at, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: "Invalid credentials" });

    // If user has no password (Google-only account), reject password login
    if (!user.password_hash) return res.status(401).json({ error: "This account uses Google sign-in. Please use the Google button." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    await pool.query("UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", [user.id]);

    const safeUser = { 
      id: user.id, 
      full_name: user.full_name, 
      email: user.email, 
      role: user.role || "user", 
      avatar_url: user.avatar_url || null,
      phone: user.phone || null,
      department: user.department || null,
      job_title: user.job_title || null,
      created_at: user.created_at || null
    };
    const token = signToken({ sub: String(user.id), role: safeUser.role, name: safeUser.full_name, email: safeUser.email });

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Error logging in:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// --- Google OAuth Login / Auto-Register ---
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "credential is required" });

    // Verify Google ID token
    let payload;
    try {
      const { OAuth2Client } = require("google-auth-library");
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return res.status(500).json({ error: "Google OAuth not configured on server" });

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error("Google token verification failed:", verifyErr.message);
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: "Google account has no email" });

    let userRow = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.avatar_url, u.phone, u.department, u.job_title, u.created_at, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.google_id = $1 OR u.email = $2
       LIMIT 1`,
      [googleId, email]
    );

    let user = userRow.rows[0];

    if (user) {
      if (!user.is_active) return res.status(401).json({ error: "Account is deactivated" });

      await pool.query(
        `UPDATE users SET
           google_id = COALESCE(google_id, $1),
           avatar_url = COALESCE($2, avatar_url),
           last_login_at = NOW(),
           updated_at = NOW()
         WHERE id = $3`,
        [googleId, picture || null, user.id]
      );

      user.avatar_url = picture || user.avatar_url;
    } else {
      const requesterRole = await pool.query("SELECT id FROM roles WHERE name = 'user' LIMIT 1");
      const roleId = requesterRole.rows[0]?.id || null;

      const inserted = await pool.query(
        `INSERT INTO users (full_name, email, google_id, avatar_url, role_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, full_name, email, avatar_url`,
        [name || email.split("@")[0], email, googleId, picture || null, roleId]
      );

      user = { ...inserted.rows[0], role: "user" };
    }

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role || "user",
      avatar_url: user.avatar_url || null,
      phone: user.phone || null,
      department: user.department || null,
      job_title: user.job_title || null,
      created_at: user.created_at || null
    };

    const token = signToken({ sub: String(user.id), role: safeUser.role, name: safeUser.full_name, email: safeUser.email });

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Error in Google auth:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// --- Get Current User ---
const getMe = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.avatar_url, u.phone, u.department, u.job_title, u.created_at, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: "Unauthorized" });
    res.json({ id: user.id, full_name: user.full_name, email: user.email, role: user.role || "user", avatar_url: user.avatar_url || null, phone: user.phone || null, department: user.department || null, job_title: user.job_title || null, created_at: user.created_at || null });
  } catch (err) {
    console.error("Error fetching me:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// --- Update Profile ---
const updateProfile = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const userRole = req.user.role;
    const { full_name, phone, department, job_title, email, current_password } = req.body;

    // Fetch current user data
    const currentRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const userCurr = currentRes.rows[0];

    // Restrict sensitive fields for non-admins
    let finalFullName = userCurr.full_name;
    let finalDepartment = userCurr.department;
    let finalJobTitle = userCurr.job_title;

    if (userRole === 'admin') {
      if (full_name) finalFullName = full_name;
      if (department) finalDepartment = department;
      if (job_title) finalJobTitle = job_title;
    }

    let finalPhone = phone !== undefined ? (phone || null) : userCurr.phone;

    let emailQueryPart = '';
    let queryParams = [finalFullName, finalPhone, finalDepartment, finalJobTitle, userId];
    let queryIndex = 6;

    if (email && email !== userCurr.email) {
      if (userCurr.password_hash) {
        if (!current_password) return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة لتغيير الإيميل" });
        const isValid = await bcrypt.compare(current_password, userCurr.password_hash);
        if (!isValid) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
      }

      const existEmail = await pool.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, userId]);
      if (existEmail.rows.length > 0) return res.status(409).json({ error: "هذا الإيميل مستخدم مسبقاً" });

      emailQueryPart = `, email = $${queryIndex}`;
      queryParams.push(email);
      queryIndex++;
    }

    const result = await pool.query(
      `UPDATE users 
       SET full_name = $1, phone = $2, department = $3, job_title = $4 ${emailQueryPart}, updated_at = NOW()
       WHERE id = $5
       RETURNING id, full_name, email, avatar_url, phone, department, job_title`,
      queryParams
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating profile:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// --- Upload Profile Image ---
const uploadProfileImage = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const imageUrl = `/uploads/${req.file.filename}`;
    const result = await pool.query(
      "UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, email, avatar_url, role_id",
      [imageUrl, userId]
    );

    const roleRes = await pool.query("SELECT name FROM roles WHERE id = $1", [result.rows[0].role_id]);
    const userWithRole = { ...result.rows[0], role: roleRes.rows[0]?.name || 'user' };

    res.json(userWithRole);
  } catch (err) {
    console.error("Error uploading profile image:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

// --- Update Password ---
const updatePassword = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const { current_password, new_password } = req.body;

    if (!new_password || new_password.length < 6) return res.status(400).json({ error: "كلمة المرور 6 أحرف على الأقل" });

    const checkHash = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    const pHash = checkHash.rows[0]?.password_hash;

    if (pHash) {
      if (!current_password) return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
      const isValid = await bcrypt.compare(current_password, pHash);
      if (!isValid) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, userId]);

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

// --- Public Registration (Sign Up) ---
const register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "Full name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "This email is already registered. Please sign in." });
    }

    const requesterRole = await pool.query("SELECT id FROM roles WHERE name = 'user' LIMIT 1");
    const roleId = requesterRole.rows[0]?.id || null;

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, full_name, email`,
      [full_name, email, passwordHash, roleId]
    );

    const user = { ...inserted.rows[0], role: "user", avatar_url: null };
    const token = signToken({ sub: String(user.id), role: user.role, name: user.full_name, email: user.email });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Error registering user:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  login,
  googleLogin,
  getMe,
  updateProfile,
  uploadProfileImage,
  updatePassword,
  register
};
