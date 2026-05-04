const pool = require("../db");

const getLabs = async (req, res) => {
  try {
    const { building } = req.query;
    let query = `
      SELECT l.*, 
        COALESCE((SELECT COUNT(*) FROM devices d WHERE d.lab_id = l.id), 0)::int AS device_count
      FROM labs l
    `;
    const params = [];
    if (building) {
      query += " WHERE l.building = $1";
      params.push(building);
    }
    query += " ORDER BY l.id DESC";
    const labs = await pool.query(query, params);
    res.json(labs.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const createLab = async (req, res) => {
  try {
    const { name, building, building_id, department } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    // إذا تم إرسال building_id، نجلب اسم المبنى تلقائياً لتوحيد حقل building النصي
    let finalBuilding = building || null;
    let finalBuildingId = building_id ? Number(building_id) : null;

    if (finalBuildingId && !finalBuilding) {
      const bRow = await pool.query("SELECT name FROM buildings WHERE id = $1", [finalBuildingId]);
      if (bRow.rows.length > 0) finalBuilding = bRow.rows[0].name;
    }

    const newLab = await pool.query(
      "INSERT INTO labs (name, building, building_id, department) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, finalBuilding, finalBuildingId, department || null]
    );
    res.status(201).json(newLab.rows[0]);
  } catch (err) {
    console.error("Error creating lab:", err.message);
    res.status(500).json({ error: `خطأ في قاعدة البيانات: ${err.message}` });
  }
};

const updateLab = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, building, building_id, department } = req.body;

    let finalBuilding = building || null;
    let finalBuildingId = building_id ? Number(building_id) : null;

    if (finalBuildingId && !finalBuilding) {
      const bRow = await pool.query("SELECT name FROM buildings WHERE id = $1", [finalBuildingId]);
      if (bRow.rows.length > 0) finalBuilding = bRow.rows[0].name;
    }

    const updated = await pool.query(
      "UPDATE labs SET name = $1, building = $2, building_id = $3, department = $4 WHERE id = $5 RETURNING *",
      [name, finalBuilding, finalBuildingId, department || null, id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating lab:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteLab = async (req, res) => {
  try {
    await pool.query("DELETE FROM labs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  getLabs,
  createLab,
  updateLab,
  deleteLab
};
