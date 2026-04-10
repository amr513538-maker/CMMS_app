const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware, requireRole } = require("../middleware/auth");

/**
 * @route   GET /api/assets
 * @desc    Get all assets with basic details
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category, status, location } = req.query;
    let query = `
      SELECT a.*, c.name as category_name, s.name as status_name, l.name as location_name
      FROM assets a
      LEFT JOIN asset_categories c ON c.id = a.category_id
      LEFT JOIN asset_statuses s ON s.id = a.status_id
      LEFT JOIN locations l ON l.id = a.location_id
      WHERE a.is_active = TRUE
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND a.category_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND a.status_id = $${params.length}`;
    }
    if (location) {
      params.push(location);
      query += ` AND a.location_id = $${params.length}`;
    }

    query += " ORDER BY a.asset_code ASC nulls last, a.id DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching assets:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

/**
 * @route   GET /api/assets/:id
 * @desc    Get full details of a specific asset
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, c.name as category_name, s.name as status_name, l.name as location_name
       FROM assets a
       LEFT JOIN asset_categories c ON c.id = a.category_id
       LEFT JOIN asset_statuses s ON s.id = a.status_id
       LEFT JOIN locations l ON l.id = a.location_id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Asset not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching asset detail:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

/**
 * @route   GET /api/assets/:id/components
 * @desc    Get all sub-components (child assets) of a station/asset
 *          Currently based on parent_id or location_id if used as a station
 */
router.get("/:id/components", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // For now, we assume sub-components share the same location_id 
    // or we could add a parent_asset_id if needed. 
    // Let's check schema.sql for parent_id in assets.
    // Wait, assets table didn't have parent_id. Let's use location_id as a proxy for station components.
    
    const assetRes = await pool.query("SELECT location_id FROM assets WHERE id = $1", [id]);
    if (assetRes.rows.length === 0) return res.status(404).json({ error: "Parent asset not found" });
    
    const locId = assetRes.rows[0].location_id;
    if (!locId) return res.json([]); // No location means no components in this simplified logic

    const components = await pool.query(
      `SELECT a.*, s.name as status_name
       FROM assets a
       LEFT JOIN asset_statuses s ON s.id = a.status_id
       WHERE a.location_id = $1 AND a.id != $2 AND a.is_active = TRUE`,
      [locId, id]
    );

    res.json(components.rows);
  } catch (err) {
    console.error("Error fetching components:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

/**
 * @route   POST /api/assets
 * @desc    Create a new asset/component
 */
router.post("/", authMiddleware, requireRole("admin", "planner"), async (req, res) => {
  try {
    const {
      asset_code, asset_name, asset_type, category_id, status_id,
      location_id, manufacturer, model, serial_number, purchase_date,
      warranty_end, criticality, notes
    } = req.body;

    if (!asset_name) return res.status(400).json({ error: "Asset name is required" });

    const result = await pool.query(
      `INSERT INTO assets (
        asset_code, asset_name, asset_type, category_id, status_id,
        location_id, manufacturer, model, serial_number, purchase_date,
        warranty_end, criticality, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        asset_code || null, asset_name, asset_type || null, category_id || null, status_id || null,
        location_id || null, manufacturer || null, model || null, serial_number || null, purchase_date || null,
        warranty_end || null, criticality || 3, notes || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating asset:", err.message);
    if (err.code === "23505") return res.status(400).json({ error: "Asset code already exists" });
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
