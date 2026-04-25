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

app.use("/api/maintenance-requests", require("./routes/maintenanceRequestRoutes"));

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