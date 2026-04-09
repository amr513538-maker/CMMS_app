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

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, "public")));

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

    const safeUser = { id: user.id, full_name: user.full_name, email: user.email, role: user.role || "requester", avatar_url: user.avatar_url || null };
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
      // New user – auto-register with "requester" role
      const requesterRole = await pool.query("SELECT id FROM roles WHERE name = 'requester' LIMIT 1");
      const roleId = requesterRole.rows[0]?.id || null;

      const inserted = await pool.query(
        `INSERT INTO users (full_name, email, google_id, avatar_url, role_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, full_name, email, avatar_url`,
        [name || email.split("@")[0], email, googleId, picture || null, roleId]
      );

      user = { ...inserted.rows[0], role: "requester" };
    }

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role || "requester",
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
    res.json({ id: user.id, full_name: user.full_name, email: user.email, role: user.role || "requester", avatar_url: user.avatar_url || null, phone: user.phone || null, department: user.department || null, job_title: user.job_title || null });
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
    const requesterRole = await pool.query("SELECT id FROM roles WHERE name = 'requester' LIMIT 1");
    const roleId = requesterRole.rows[0]?.id || null;

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, full_name, email`,
      [full_name, email, passwordHash, roleId]
    );

    const user = { ...inserted.rows[0], role: "requester", avatar_url: null };

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
app.post("/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "full_name, email, password are required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, role_id, is_active, created_at",
      [full_name, email, passwordHash]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error("Error creating user:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Get all users
app.get("/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const allUsers = await pool.query(
      `SELECT u.id, u.full_name, u.email, r.name AS role, u.is_active, u.created_at
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       ORDER BY u.id`
    );
    res.json(allUsers.rows);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// --------------------------------------------------------
// 6. Asset Routes
// --------------------------------------------------------

// Create asset
app.post("/assets", async (req, res) => {
  try {
    const { asset_name, asset_type, location } = req.body;
    if (!asset_name) {
      return res.status(400).json({ error: "asset_name is required" });
    }
    const newAsset = await pool.query(
      "INSERT INTO assets (asset_name, asset_type, notes) VALUES($1, $2, $3) RETURNING *",
      [asset_name, asset_type || null, location || null]
    );
    res.json(newAsset.rows[0]);
  } catch (err) {
    console.error("Error creating asset:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Get all assets
app.get("/assets", async (req, res) => {
  try {
    const allAssets = await pool.query(
      "SELECT id, asset_name, asset_type, location_id, notes, created_at FROM assets ORDER BY id"
    );
    res.json(allAssets.rows);
  } catch (err) {
    console.error("Error fetching assets:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Bulk insert assets
app.post("/assets/bulk", async (req, res) => {
  try {
    const assets = req.body;
    const insertedAssets = [];

    for (const asset of assets) {
      const { asset_name, asset_type, location } = asset;
      const result = await pool.query(
        "INSERT INTO assets (asset_name, asset_type, notes) VALUES($1, $2, $3) RETURNING *",
        [asset_name, asset_type || null, location || null]
      );
      insertedAssets.push(result.rows[0]);
    }

    res.json({
      message: `تم إضافة ${insertedAssets.length} جهاز بنجاح!`,
      data: insertedAssets,
    });
  } catch (err) {
    console.error("Error bulk inserting assets:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// --------------------------------------------------------
// 7. Maintenance Request Routes
// --------------------------------------------------------

app.post("/api/maintenance-requests", upload.single("image"), authMiddleware, async (req, res) => {
  try {
    const { deviceName, location, issueDescription, priority } = req.body;
    if (!issueDescription) return res.status(400).json({ error: "issueDescription is required" });

    const priorityName = (priority || "Medium").toString().toLowerCase();
    const mappedPriority = priorityName === "high" ? "High" : priorityName === "low" ? "Low" : priorityName === "critical" ? "Critical" : "Medium";
    const priorityRow = await pool.query("SELECT id FROM priorities WHERE name = $1", [mappedPriority]);
    const priorityId = priorityRow.rows[0]?.id ?? null;
    const requestedBy = Number(req.user.sub);

    // 15 Digit random code
    const reqCode = Array.from({length: 15}, () => Math.floor(Math.random() * 10)).join('');
    
    // Check if image uploaded
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const inserted = await pool.query(
      `INSERT INTO maintenance_requests (request_code, asset_name, location, description, image_url, priority_id, requested_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'New')
       RETURNING id, request_code, asset_name, location, description, image_url, priority_id, status, requested_at`,
      [reqCode, deviceName || null, location || null, issueDescription, imageUrl, priorityId, requestedBy]
    );

    const reqId = inserted.rows[0].id;
    await pool.query(
      `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'system', 'تم إنشاء الطلب بنجاح')`,
      [reqId, requestedBy]
    );

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
    }

    if (assign_to && (role === "admin" || role === "planner")) {
       await pool.query(`UPDATE maintenance_requests SET assigned_to = $1 WHERE id = $2`, [assign_to, reqId]);
       const techRow = await pool.query("SELECT full_name FROM users WHERE id = $1", [assign_to]);
       const techName = techRow.rows[0]?.full_name || "فني";
       await pool.query(
         `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'assignment', $3)`,
         [reqId, userId, `تم تعيين الطلب إلى: ${techName}`]
       );
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

// --------------------------------------------------------
// 8. SPA Fallback – serve index.html for all non-API routes
// --------------------------------------------------------
app.get("{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------------------------------------------
// 9. Server Start
// --------------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n  🚀 CMMS Server running at http://localhost:${PORT}`);
  console.log(`  📁 Frontend served from /public`);
  console.log(`  🔗 API available at http://localhost:${PORT}/api\n`);
});