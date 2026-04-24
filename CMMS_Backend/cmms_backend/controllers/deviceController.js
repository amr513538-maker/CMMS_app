const pool = require("../db");

const getDevices = async (req, res) => {
  try {
    const devices = await pool.query(`
      SELECT d.*, l.name AS lab_name, l.building
      FROM devices d
      LEFT JOIN labs l ON l.id = d.lab_id
      ORDER BY d.id DESC
    `);
    res.json(devices.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const getDevicesByLab = async (req, res) => {
  try {
    const devices = await pool.query("SELECT * FROM devices WHERE lab_id = $1 ORDER BY id DESC", [req.params.labId]);
    res.json(devices.rows);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const createDevice = async (req, res) => {
  try {
    const { name, type, status, lab_id, labId } = req.body;
    const actualLabId = lab_id || labId;
    if (!name || !actualLabId) return res.status(400).json({ error: "Name and lab_id are required" });
    const newDev = await pool.query("INSERT INTO devices (name, type, status, lab_id) VALUES ($1, $2, $3, $4) RETURNING *", [name, type, status || 'Active', actualLabId]);
    res.status(201).json(newDev.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, status } = req.body;
    const updated = await pool.query("UPDATE devices SET name = $1, type = $2, status = $3 WHERE id = $4 RETURNING *", [name, type, status, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteDevice = async (req, res) => {
  try {
    await pool.query("DELETE FROM devices WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const getAllDevicesITSupport = async (req, res) => {
  try {
    const devices = await pool.query(
      `SELECT d.*, l.name as lab_name FROM devices d LEFT JOIN labs l ON l.id = d.lab_id ORDER BY d.id DESC`
    );
    res.json(devices.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const updateDeviceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await pool.query("UPDATE devices SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

module.exports = {
  getDevices,
  getDevicesByLab,
  createDevice,
  updateDevice,
  deleteDevice,
  getAllDevicesITSupport,
  updateDeviceStatus
};
