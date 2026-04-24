const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const upload = require("./middleware/upload");

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

const { authMiddleware, requireRole } = require("./middleware/auth");
const { signToken } = require("./utils/jwt");

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

app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/users", require("./routes/userRoutes"));

// --------------------------------------------------------
// Settings Routes (Admin only: Roles, Labs, Devices)
// --------------------------------------------------------

app.use("/api/roles", require("./routes/roleRoutes"));
app.use("/api/buildings", require("./routes/buildingRoutes"));
app.use("/api/labs", require("./routes/labRoutes"));
app.use("/api/devices", require("./routes/deviceRoutes"));

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

    let finalAssetName = deviceName || null;
    let finalLocation = location || null;

    if (device_id) {
      const devRow = await pool.query(
        "SELECT d.name, l.name as lab_name, l.building FROM devices d LEFT JOIN labs l ON l.id = d.lab_id WHERE d.id = $1",
        [device_id]
      );
      if (devRow.rows.length > 0) {
        finalAssetName = devRow.rows[0].name;
        if (!finalLocation && devRow.rows[0].lab_name) {
          finalLocation = `مبنى ${devRow.rows[0].building} - ${devRow.rows[0].lab_name}`;
        }
      }
    }

    const inserted = await pool.query(
      `INSERT INTO maintenance_requests (request_code, title, asset_name, location, description, image_url, priority_id, requested_by, assigned_to, status, device_id, lab_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, request_code, title, asset_name, location, description, image_url, priority_id, status, requested_at`,
      [reqCode, title || issueDescription.substring(0, 100), finalAssetName, finalLocation, issueDescription, imageUrl, priorityId, requestedBy, assignedId, initialStatus, device_id || null, lab_id || null]
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

// NOTE: Dashboard Stats Route is defined below in section 15 (Enhanced Dashboard Stats)

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

// Update Maintenance Request Status (Admin / IT Support)
app.put("/api/maintenance-requests/:id/status", authMiddleware, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    const userId = Number(req.user.sub);
    const role = req.user.role;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: "الحالة مطلوبة" });
    if (role === "user") return res.status(403).json({ error: "Access Denied" });

    const requestRow = await pool.query("SELECT * FROM maintenance_requests WHERE id = $1", [reqId]);
    if (requestRow.rows.length === 0) return res.status(404).json({ error: "الطلب غير موجود" });
    const oldStatus = requestRow.rows[0].status;

    if (status !== oldStatus) {
      let dateQuery = "";
      if (status === "In Progress") dateQuery = ", started_at = NOW()";
      if (status === "Done") dateQuery = ", completed_at = NOW()";

      await pool.query(`UPDATE maintenance_requests SET status = $1 ${dateQuery} WHERE id = $2`, [status, reqId]);
      await pool.query(
        `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'status_change', $3)`,
        [reqId, userId, `تم تغيير الحالة إلى: ${status}`]
      );
      await notifyOnStatusChange(reqId, status, userId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating status:", err.message);
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



app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/schedule", require("./routes/scheduleRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/job-titles", require("./routes/jobTitleRoutes"));

// --------------------------------------------------------
// 9. Server Start
// --------------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n  🚀 CMMS Server running at http://localhost:${PORT}`);
});