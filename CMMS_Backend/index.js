const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "public/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, ''));
  }
});
const upload = multer({ storage: storage });

const app = express();

// --------------------------------------------------------
// 1. Middleware
// --------------------------------------------------------
app.use(cors());
app.use(express.json());

// Serve uploaded files securely from /public/uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// --------------------------------------------------------
// 2. Helpers
// --------------------------------------------------------

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: "Unauthorized" });
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

// --------------------------------------------------------
// 3. ROUTES
// --------------------------------------------------------

// --- Health Check ---
// Root API entry
app.get("/api", (req, res) => {
  res.json({
    message: "CMMS API is running",
    version: "1.0.0",
    docs: "For API documentation, contact admin"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// --- Public Config (exposes non-secret config to frontend) ---
app.get("/api/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  });
});

// --------------------------------------------------------
// 4. Auth Routes
// --------------------------------------------------------

// --- Email/Password Login ---
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, u.avatar_url, r.name AS role
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

    const safeUser = { id: user.id, full_name: user.full_name, email: user.email, role: user.role || "user", avatar_url: user.avatar_url || null };
    const token = signToken({ sub: String(user.id), role: safeUser.role, name: safeUser.full_name, email: safeUser.email });

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Error logging in:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- Google OAuth Login / Auto-Register ---
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "credential is required" });

    // Verify Google ID token
    let payload;
    try {
      // Decode the JWT (Google ID tokens are JWTs)
      // For production, use google-auth-library. Here we do a lightweight verification.
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

    // Check if user already exists (by google_id or email)
    let userRow = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.avatar_url, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.google_id = $1 OR u.email = $2
       LIMIT 1`,
      [googleId, email]
    );

    let user = userRow.rows[0];

    if (user) {
      // Existing user – update google_id & avatar if missing, then login
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
      // New user – auto-register with "user" role
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
    };

    const token = signToken({ sub: String(user.id), role: safeUser.role, name: safeUser.full_name, email: safeUser.email });

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Error in Google auth:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- Get Current User ---
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.avatar_url, u.phone, u.department, u.job_title, r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: "Unauthorized" });
    res.json({ id: user.id, full_name: user.full_name, email: user.email, role: user.role || "user", avatar_url: user.avatar_url || null, phone: user.phone || null, department: user.department || null, job_title: user.job_title || null });
  } catch (err) {
    console.error("Error fetching me:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- Update Profile ---
app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const { full_name, phone, department, job_title, email, current_password } = req.body;

    if (!full_name) return res.status(400).json({ error: "الاسم مطلوب" });

    let emailQueryPart = '';
    let queryParams = [full_name, phone || null, department || null, job_title || null, userId];
    let queryIndex = 6;

    if (email) {
      const checkEmail = await pool.query("SELECT email, password_hash FROM users WHERE id = $1", [userId]);
      const userCurr = checkEmail.rows[0];
      if (userCurr.email !== email) {
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
});

// --- Upload Profile Image ---
app.post("/api/auth/profile/image", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const imageUrl = `/uploads/${req.file.filename}`;
    const result = await pool.query(
      "UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, email, avatar_url, role_id",
      [imageUrl, userId]
    );

    // Get role name
    const roleRes = await pool.query("SELECT name FROM roles WHERE id = $1", [result.rows[0].role_id]);
    const userWithRole = { ...result.rows[0], role: roleRes.rows[0]?.name || 'user' };

    res.json(userWithRole);
  } catch (err) {
    console.error("Error uploading profile image:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});


// --- Update Password ---
app.put("/api/auth/password", authMiddleware, async (req, res) => {
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

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// --------------------------------------------------------
// 5. Public Registration (Sign Up)
// --------------------------------------------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "Full name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if email already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "This email is already registered. Please sign in." });
    }

    // Get requester role
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
});

// --------------------------------------------------------
// 6. User Routes (Admin only)
// --------------------------------------------------------

// Create new user
app.post("/api/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { full_name, email, password, role, phone, department, job_title } = req.body;

    if (!full_name || full_name.length < 8 || full_name.length > 16) {
      return res.status(400).json({ error: "الاسم يجب أن يكون بين 8 و 16 حرفاً وهو حقل إجباري" });
    }
    // Letters only (Arabic & English) and spaces. No numbers or symbols.
    if (!/^[\u0621-\u064Aa-zA-Z\s]+$/.test(full_name)) {
      return res.status(400).json({ error: "الاسم يجب أن يحتوي على حروف فقط بدون أرقام أو رموز" });
    }

    // Uniqueness check for full_name
    const nameCheck = await pool.query("SELECT id FROM users WHERE full_name = $1", [full_name]);
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: "هذا الاسم مستخدم بالفعل، يرجى اختيار اسم آخر" });
    }
    const emailRegex = /^[a-zA-Z0-9]{5,}@gmail\.com$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني يجب أن يكون Gmail وينتهي بـ @gmail.com ويحتوي 5 أحرف أو أرقام قبلها كحد أدنى بدون رموز" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 8 أحرف" });
    }
    if (phone) {
      if (!/^\d{11,}$/.test(phone)) {
        return res.status(400).json({ error: "رقم الهاتف يجب أن يتكون من أرقام فقط ولا يقل عن 11 رقم" });
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
    else if (role && role.toLowerCase() === 'it support') dbRoleName = 'IT Support';
    else if (role !== 'user') return res.status(400).json({ error: "الدور والصلاحية غير صحيحة" });

    const passwordHash = await bcrypt.hash(password, 10);

    let roleId = null;
    const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1 LIMIT 1", [dbRoleName]);
    if (roleRes.rows.length > 0) roleId = roleRes.rows[0].id;

    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role_id, phone, department, job_title, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id, full_name, email, role_id, is_active, created_at",
      [full_name, email, passwordHash, roleId, phone || null, department || null, job_title || null]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error("Error creating user:", err.message);
    if (err.code === '23505') return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
    res.status(500).json({ error: "Server Error" });
  }
});

// Update user
app.put("/api/users/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, password, role, phone, department, job_title } = req.body;

    if (!full_name || full_name.length < 8 || full_name.length > 16) {
      return res.status(400).json({ error: "الاسم يجب أن يكون بين 8 و 16 حرفاً وهو حقل إجباري" });
    }
    // Letters only (Arabic & English) and spaces. No numbers or symbols.
    if (!/^[\u0621-\u064Aa-zA-Z\s]+$/.test(full_name)) {
      return res.status(400).json({ error: "الاسم يجب أن يحتوي على حروف فقط بدون أرقام أو رموز" });
    }

    // Uniqueness check for full_name (excluding current user)
    const nameCheck = await pool.query("SELECT id FROM users WHERE full_name = $1 AND id != $2", [full_name, id]);
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: "هذا الاسم مستخدم بالفعل لمستخدم آخر" });
    }
    const emailRegex = /^[a-zA-Z0-9]{5,}@gmail\.com$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني يجب أن يكون Gmail وينتهي بـ @gmail.com ويحتوي 5 أحرف أو أرقام قبلها كحد أدنى بدون رموز" });
    }
    if (password && password.trim() !== "") {
      if (password.length < 8) return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 8 أحرف" });
    }
    if (phone) {
      if (!/^\d{11,}$/.test(phone)) {
        return res.status(400).json({ error: "رقم الهاتف يجب أن يتكون من أرقام فقط ولا يقل عن 11 رقم" });
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
    else if (role && role.toLowerCase() === 'it support') dbRoleName = 'IT Support';
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

    const updatedUser = await pool.query(
      `UPDATE users
       SET full_name = $1, email = $2, role_id = $3, phone = $4, department = $5, job_title = $6 ${passQuery}, updated_at = NOW()
       WHERE id = $7
       RETURNING id, full_name, email, role_id, is_active, updated_at`,
      params
    );

    if (updatedUser.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error("Error updating user:", err.message);
    if (err.code === '23505') return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً لمستخدم آخر" });
    res.status(500).json({ error: "Server Error" });
  }
});

// Get all users
app.get("/api/users", authMiddleware, requireRole("admin"), async (req, res) => {
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
});

// Get all IT Support technicians
app.get("/api/users/it-support", authMiddleware, async (req, res) => {
  try {
    const techs = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = 'IT Support' AND u.is_active = TRUE
       ORDER BY u.full_name ASC`
    );
    res.json(techs.rows);
  } catch (err) {
    console.error("Error fetching technicians:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Batch Delete users
app.post("/api/users/delete", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "عليك اختيار مستخدم واحد على الأقل" });
    }

    const idList = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (idList.length === 0) return res.status(400).json({ error: "Invalid IDs" });

    // Prevent deleting the main admins
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
    if (err.code === '23503') { // Foreign key violation
      return res.status(409).json({ error: "لا يمكن حذف مستخدمين مرتبطين بطلبات صيانة. يرجى تعديلهم بدلاً من الحذف." });
    }
    res.status(500).json({ error: "Server Error" });
  }
});

// --------------------------------------------------------
// Settings Routes (Admin only: Roles, Labs, Devices)
// --------------------------------------------------------

// --- ROLES ---
app.get("/api/roles", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const roles = await pool.query("SELECT * FROM roles ORDER BY id");
    res.json(roles.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post("/api/roles", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const newRole = await pool.query("INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *", [name.toLowerCase(), description]);
    res.status(201).json(newRole.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.put("/api/roles/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const updated = await pool.query("UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *", [name.toLowerCase(), description, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.delete("/api/roles/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM roles WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Cannot delete role in use." });
  }
});

// --- LABS ---
app.get("/api/labs", authMiddleware, async (req, res) => {
  try {
    const labs = await pool.query("SELECT * FROM labs ORDER BY id DESC");
    res.json(labs.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post("/api/labs", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, location, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const newLab = await pool.query("INSERT INTO labs (name, location, description) VALUES ($1, $2, $3) RETURNING *", [name, location, description]);
    res.status(201).json(newLab.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.put("/api/labs/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, description } = req.body;
    const updated = await pool.query("UPDATE labs SET name = $1, location = $2, description = $3 WHERE id = $4 RETURNING *", [name, location, description, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.delete("/api/labs/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM labs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// --- DEVICES ---
app.get("/api/devices/:labId", authMiddleware, async (req, res) => {
  try {
    const devices = await pool.query("SELECT * FROM devices WHERE lab_id = $1 ORDER BY id DESC", [req.params.labId]);
    res.json(devices.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post("/api/devices", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, type, status, labId } = req.body;
    if (!name || !labId) return res.status(400).json({ error: "Name and labId are required" });
    const newDev = await pool.query("INSERT INTO devices (name, type, status, lab_id) VALUES ($1, $2, $3, $4) RETURNING *", [name, type, status || 'Active', labId]);
    res.status(201).json(newDev.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.put("/api/devices/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, status } = req.body;
    const updated = await pool.query("UPDATE devices SET name = $1, type = $2, status = $3 WHERE id = $4 RETURNING *", [name, type, status, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.delete("/api/devices/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM devices WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// --------------------------------------------------------
// 7. Maintenance Request Routes
// --------------------------------------------------------

app.post("/api/maintenance-requests", upload.single("image"), authMiddleware, async (req, res) => {
  try {
    const { title, deviceName, location, issueDescription, priority, device_id, lab_id, assigned_to } = req.body;
    if (!issueDescription) return res.status(400).json({ error: "issueDescription is required" });

    const priorityName = (priority || "Medium").toString().toLowerCase();
    const mappedPriority = priorityName === "high" ? "High" : priorityName === "low" ? "Low" : priorityName === "critical" ? "Critical" : "Medium";
    const priorityRow = await pool.query("SELECT id FROM priorities WHERE name = $1", [mappedPriority]);
    const priorityId = priorityRow.rows[0]?.id ?? null;
    const requestedBy = Number(req.user.sub);

    const reqCode = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Always start with 'New' status, even if assigned to someone
    const initialStatus = 'New';
    const assignedId = assigned_to ? Number(assigned_to) : null;

    const inserted = await pool.query(
      `INSERT INTO maintenance_requests (request_code, title, asset_name, location, description, image_url, priority_id, requested_by, assigned_to, status, device_id, lab_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, request_code, title, asset_name, location, description, image_url, priority_id, status, requested_at`,
      [reqCode, title || issueDescription.substring(0, 100), deviceName || null, location || null, issueDescription, imageUrl, priorityId, requestedBy, assignedId, initialStatus, device_id || null, lab_id || null]
    );

    const reqId = inserted.rows[0].id;
    await pool.query(
      `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'system', 'تم إنشاء الطلب بنجاح ${assignedId ? 'وتكليفه لفني' : ''}')`,
      [reqId, requestedBy]
    );

    // Notify all admins about new request
    const admins = await pool.query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin'");
    for (const admin of admins.rows) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)",
        [admin.id, 'طلب صيانة جديد', `طلب جديد: ${title || issueDescription.substring(0, 40)}`, `/track/${reqCode}`]);
    }

    // Notify assigned technician if any
    if (assignedId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)",
        [assignedId, 'تكليف بمهمة جديدة', `تم تكليفك بطلب صيانة: ${title || issueDescription.substring(0, 40)}`, `/track/${reqCode}`]);
    }

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error("Error creating maintenance request:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Dashboard Stats Route
app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = Number(req.user.sub);
    let condition = "";
    let params = [];

    if (role === "requester") {
      condition = "WHERE requested_by = $1";
      params.push(userId);
    } else if (role === "technician") {
      condition = "WHERE (assigned_to = $1 OR assigned_to IS NULL)";
      params.push(userId);
    }

    // KPIs
    const kpiRes = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('New', 'Assigned')) AS open_req,
        COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress_req,
        COUNT(*) FILTER (WHERE status = 'Done') AS done_req
      FROM maintenance_requests ${condition}
    `, params);

    const kpis = {
      total: parseInt(kpiRes.rows[0].total) || 0,
      open: parseInt(kpiRes.rows[0].open_req) || 0,
      inProgress: parseInt(kpiRes.rows[0].in_progress_req) || 0,
      done: parseInt(kpiRes.rows[0].done_req) || 0
    };

    // Chart Data
    const chartRes = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM maintenance_requests ${condition}
      GROUP BY status
    `, params);
    const statusChart = chartRes.rows;

    const limitStr = (role === "requester" || role === "technician") ? " LIMIT 5" : " LIMIT 10";
    const recentRes = await pool.query(`
      SELECT id, request_code, asset_name, status, requested_at
      FROM maintenance_requests
      ${condition}
      ORDER BY requested_at DESC
      ${limitStr}
    `, params);

    let criticalReqs = [];
    if (role === "admin" || role === "technician" || role === "planner") {
      let tCond = role === "technician" ? "AND assigned_to = $1" : "";
      let tParams = role === "technician" ? [userId] : [];
      criticalReqs = await pool.query(`
        SELECT r.id, r.request_code, r.asset_name, r.status, p.name as priority
        FROM maintenance_requests r
        JOIN priorities p ON r.priority_id = p.id
        WHERE p.name IN ('High', 'Critical') AND r.status != 'Done' ${tCond}
        ORDER BY r.requested_at DESC LIMIT 5
      `, tParams).then(r => r.rows);
    }

    res.json({ kpis, statusChart, recentRequests: recentRes.rows, criticalRequests: criticalReqs });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// List Requests (Filtered)
app.get("/api/maintenance-requests", authMiddleware, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = Number(req.user.sub);
    let condition = "";
    let params = [];

    if (role === "requester") {
      condition = "WHERE mr.requested_by = $1";
      params.push(userId);
    } else if (role === "technician") {
      condition = "WHERE (mr.assigned_to = $1 OR mr.status = 'New')";
      params.push(userId);
    }

    const rows = await pool.query(
      `SELECT mr.id, mr.request_code, mr.asset_name, mr.description, p.name AS priority, mr.status, mr.requested_at, u.full_name as assigned_to
       FROM maintenance_requests mr
       LEFT JOIN priorities p ON p.id = mr.priority_id
       LEFT JOIN users u ON u.id = mr.assigned_to
       ${condition}
       ORDER BY mr.id DESC LIMIT 100`, params
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Track Individual request
app.get("/api/maintenance-requests/track/:code", authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const reqRes = await pool.query(`
      SELECT mr.*, p.name as priority,
             uReq.full_name as requested_by_name,
             uAsg.full_name as assigned_to_name
      FROM maintenance_requests mr
      LEFT JOIN priorities p ON p.id = mr.priority_id
      LEFT JOIN users uReq ON uReq.id = mr.requested_by
      LEFT JOIN users uAsg ON uAsg.id = mr.assigned_to
      WHERE mr.request_code = $1 OR mr.id::text = $1 LIMIT 1
    `, [code]);

    if (reqRes.rows.length === 0) return res.status(404).json({ error: "الطلب غير موجود" });
    const requestData = reqRes.rows[0];

    const eventsRes = await pool.query(`
      SELECT e.*, u.full_name as user_name, u.avatar_url
      FROM request_events e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.request_id = $1
      ORDER BY e.created_at ASC
    `, [requestData.id]);

    res.json({ request: requestData, events: eventsRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Add Event / Comment / Update Status
app.post("/api/maintenance-requests/:id/events", authMiddleware, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    const userId = Number(req.user.sub);
    const role = req.user.role;
    const { event_type, message, new_status, assign_to } = req.body;

    if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

    const requestRow = await pool.query("SELECT * FROM maintenance_requests WHERE id = $1", [reqId]);
    if (requestRow.rows.length === 0) return res.status(404).json({ error: "Not Found" });
    const oldStatus = requestRow.rows[0].status;

    if (new_status && new_status !== oldStatus) {
      if (role === "requester") return res.status(403).json({ error: "Access Denied" });

      let dateQuery = "";
      if (new_status === "In Progress") dateQuery = ", started_at = NOW()";
      if (new_status === "Done") dateQuery = ", completed_at = NOW()";

      await pool.query(`UPDATE maintenance_requests SET status = $1 ${dateQuery} WHERE id = $2`, [new_status, reqId]);
      await pool.query(
        `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'status_change', $3)`,
        [reqId, userId, `تم تغيير الحالة إلى: ${new_status}`]
      );
      await notifyOnStatusChange(reqId, new_status, userId);
    }

    if (assign_to && (role === "admin" || role === "planner")) {
      await pool.query(`UPDATE maintenance_requests SET assigned_to = $1 WHERE id = $2`, [assign_to, reqId]);
      const techRow = await pool.query("SELECT full_name FROM users WHERE id = $1", [assign_to]);
      const techName = techRow.rows[0]?.full_name || "فني";
      await pool.query(
        `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'assignment', $3)`,
        [reqId, userId, `تم تعيين الطلب إلى: ${techName}`]
      );
      await notifyOnAssignment(reqId, assign_to, userId);
    }

    if (event_type === "comment") {
      await pool.query(
        `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'comment', $3)`,
        [reqId, userId, message]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Delete Maintenance Request (Admin Only)
app.delete("/api/maintenance-requests/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    // First delete associated events
    await pool.query("DELETE FROM request_events WHERE request_id = $1", [id]);

    // Then delete the request
    const result = await pool.query("DELETE FROM maintenance_requests WHERE id = $1 RETURNING request_code", [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "الطلب غير موجود" });

    res.json({ success: true, message: "تم حذف الطلب بنجاح" });
  } catch (err) {
    console.error("Error deleting request:", err.message);
    res.status(500).json({ error: "لا يمكن حذف الطلب لوجود بيانات مرتبطة به" });
  }
});


// --------------------------------------------------------
// 10. Notifications Routes
// --------------------------------------------------------

app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const notifs = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId]
    );
    res.json(notifs.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.get("/api/notifications/unread-count", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const r = await pool.query("SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE", [userId]);
    res.json({ count: parseInt(r.rows[0].count) });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.put("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [req.params.id, Number(req.user.sub)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.put("/api/notifications/read-all", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [Number(req.user.sub)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// --------------------------------------------------------
// 11. Audit Log Routes
// --------------------------------------------------------

app.get("/api/audit-logs", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const logs = await pool.query(
      `SELECT a.*, u.full_name as actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.created_at DESC LIMIT 200`
    );
    res.json(logs.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// --------------------------------------------------------
// 12. Reports Routes
// --------------------------------------------------------

app.get("/api/reports/summary", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { from, to, lab_id, status } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (from) { conditions.push(`mr.requested_at >= $${i++}`); params.push(from); }
    if (to) { conditions.push(`mr.requested_at <= $${i++}`); params.push(to); }
    if (lab_id) { conditions.push(`mr.lab_id = $${i++}`); params.push(lab_id); }
    if (status) { conditions.push(`mr.status = $${i++}`); params.push(status); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const summary = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE mr.status = 'Done') as completed,
        COUNT(*) FILTER (WHERE mr.status IN ('New','Assigned')) as open,
        COUNT(*) FILTER (WHERE mr.status = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE mr.status = 'Cancelled') as cancelled
      FROM maintenance_requests mr ${where}
    `, params);

    const byLab = await pool.query(`
      SELECT l.name as lab_name, COUNT(*) as count
      FROM maintenance_requests mr
      LEFT JOIN labs l ON l.id = mr.lab_id
      ${where}
      GROUP BY l.name ORDER BY count DESC
    `, params);

    const byPriority = await pool.query(`
      SELECT p.name as priority, COUNT(*) as count
      FROM maintenance_requests mr
      LEFT JOIN priorities p ON p.id = mr.priority_id
      ${where}
      GROUP BY p.name ORDER BY count DESC
    `, params);

    const byTech = await pool.query(`
      SELECT u.full_name as technician, COUNT(*) as total,
        COUNT(*) FILTER (WHERE mr.status = 'Done') as completed
      FROM maintenance_requests mr
      LEFT JOIN users u ON u.id = mr.assigned_to
      ${where}
      GROUP BY u.full_name ORDER BY total DESC
    `, params);

    const details = await pool.query(`
      SELECT mr.id, mr.request_code, mr.title, mr.asset_name, mr.description, mr.status,
        p.name as priority, l.name as lab_name, d.name as device_name,
        uReq.full_name as requester, uAsg.full_name as technician,
        mr.requested_at, mr.completed_at
      FROM maintenance_requests mr
      LEFT JOIN priorities p ON p.id = mr.priority_id
      LEFT JOIN labs l ON l.id = mr.lab_id
      LEFT JOIN devices d ON d.id = mr.device_id
      LEFT JOIN users uReq ON uReq.id = mr.requested_by
      LEFT JOIN users uAsg ON uAsg.id = mr.assigned_to
      ${where}
      ORDER BY mr.requested_at DESC LIMIT 500
    `, params);

    res.json({
      summary: summary.rows[0],
      byLab: byLab.rows,
      byPriority: byPriority.rows,
      byTech: byTech.rows,
      details: details.rows
    });
  } catch (err) {
    console.error("Reports error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// --------------------------------------------------------
// 13. Schedule (PM Plans) Routes
// --------------------------------------------------------

app.get("/api/schedule", authMiddleware, async (req, res) => {
  try {
    const plans = await pool.query(`
      SELECT pp.*,
        array_agg(DISTINCT pt.task_name) FILTER (WHERE pt.task_name IS NOT NULL) as tasks
      FROM pm_plans pp
      LEFT JOIN pm_plan_tasks pt ON pt.pm_plan_id = pp.id
      GROUP BY pp.id
      ORDER BY pp.id DESC
    `);
    res.json(plans.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.post("/api/schedule", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, frequency_type, frequency_value, tasks } = req.body;
    if (!name || !frequency_type || !frequency_value) return res.status(400).json({ error: "name, frequency_type, frequency_value required" });
    const plan = await pool.query(
      "INSERT INTO pm_plans (name, description, frequency_type, frequency_value) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, description, frequency_type, parseInt(frequency_value)]
    );
    const planId = plan.rows[0].id;
    if (tasks && Array.isArray(tasks)) {
      for (let i = 0; i < tasks.length; i++) {
        await pool.query("INSERT INTO pm_plan_tasks (pm_plan_id, task_name, sort_order) VALUES ($1,$2,$3)", [planId, tasks[i], i]);
      }
    }
    res.status(201).json(plan.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.put("/api/schedule/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, frequency_type, frequency_value, is_active } = req.body;
    const updated = await pool.query(
      "UPDATE pm_plans SET name=$1, description=$2, frequency_type=$3, frequency_value=$4, is_active=$5 WHERE id=$6 RETURNING *",
      [name, description, frequency_type, parseInt(frequency_value), is_active !== false, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.delete("/api/schedule/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM pm_plans WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// --------------------------------------------------------
// 14. IT Support: All Devices + Status Update
// --------------------------------------------------------

app.get("/api/devices/all", authMiddleware, async (req, res) => {
  try {
    const devices = await pool.query(
      `SELECT d.*, l.name as lab_name FROM devices d LEFT JOIN labs l ON l.id = d.lab_id ORDER BY d.id DESC`
    );
    res.json(devices.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.put("/api/devices/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await pool.query("UPDATE devices SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// --------------------------------------------------------
// 15. Enhanced Dashboard Stats (Role-Aware)
// --------------------------------------------------------

app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const role = req.user.role;
    let whereClause = "";
    let params = [];

    if (role === 'requester') {
      whereClause = "WHERE requested_by = $1";
      params.push(userId);
    } else if (role === 'technician') {
      whereClause = "WHERE assigned_to = $1";
      params.push(userId);
    }

    const kpisQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('New', 'Assigned')) as open,
        COUNT(*) FILTER (WHERE status = 'In Progress') as inProgress,
        COUNT(*) FILTER (WHERE status = 'Done') as done
      FROM maintenance_requests ${whereClause}
    `;
    const kpisRes = await pool.query(kpisQuery, params);

    const chartRes = await pool.query(`SELECT status, COUNT(*) as count FROM maintenance_requests ${whereClause} GROUP BY status`, params);

    const recentRes = await pool.query(`SELECT * FROM maintenance_requests ${whereClause} ORDER BY requested_at DESC LIMIT 5`, params);

    res.json({
      kpis: {
        total: parseInt(kpisRes.rows[0].total) || 0,
        open: parseInt(kpisRes.rows[0].open) || 0,
        inProgress: parseInt(kpisRes.rows[0].inprogress) || 0,
        done: parseInt(kpisRes.rows[0].done) || 0
      },
      statusChart: chartRes.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
      recentRequests: recentRes.rows
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/dashboard/admin-stats", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const totalDevices = await pool.query("SELECT COUNT(*) as count FROM devices");
    const totalLabs = await pool.query("SELECT COUNT(*) as count FROM labs");
    const totalUsers = await pool.query("SELECT COUNT(*) as count FROM users");
    const devicesByStatus = await pool.query("SELECT status, COUNT(*) as count FROM devices GROUP BY status");
    const labsList = await pool.query("SELECT l.id, l.name, (SELECT COUNT(*) FROM devices d WHERE d.lab_id = l.id) as device_count FROM labs l ORDER BY l.id");
    res.json({
      totalDevices: parseInt(totalDevices.rows[0].count),
      totalLabs: parseInt(totalLabs.rows[0].count),
      totalUsers: parseInt(totalUsers.rows[0].count),
      devicesByStatus: devicesByStatus.rows,
      labs: labsList.rows
    });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// Helper: auto-notify on status change
async function notifyOnStatusChange(reqId, newStatus, actorUserId) {
  try {
    const req = await pool.query("SELECT requested_by, assigned_to, request_code, title FROM maintenance_requests WHERE id = $1", [reqId]);
    if (req.rows.length === 0) return;
    const r = req.rows[0];
    const msg = `تم تحديث حالة الطلب ${r.request_code} إلى: ${newStatus}`;
    const link = `/track/${r.request_code}`;

    // Notify requester
    if (r.requested_by && r.requested_by !== actorUserId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
        [r.requested_by, 'تحديث حالة الطلب', msg, link]);
    }
    // Notify assigned tech
    if (r.assigned_to && r.assigned_to !== actorUserId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
        [r.assigned_to, 'تحديث حالة الطلب', msg, link]);
    }
  } catch (e) { console.error('Notify error:', e.message); }
}

async function notifyOnAssignment(reqId, techId, actorUserId) {
  try {
    const r = await pool.query("SELECT request_code, title FROM maintenance_requests WHERE id = $1", [reqId]);
    if (r.rows.length === 0) return;
    const req = r.rows[0];
    await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
      [techId, 'تم تكليفك بطلب صيانة', `تم تكليفك بالطلب: ${req.request_code}`, `/track/${req.request_code}`]);
  } catch (e) { console.error('Notify error:', e.message); }
}

// --------------------------------------------------------
// 9. Server Start
// --------------------------------------------------------
const PORT = process.env.PORT || 5000;

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("Final Error Handler:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(PORT, () => {
  console.log(`\n  🚀 CMMS Server running at http://localhost:${PORT}`);
});