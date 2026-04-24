const pool = require("../db");

const getSchedulePlans = async (req, res) => {
  try {
    const plans = await pool.query(`
      SELECT pp.*,
        array_agg(DISTINCT a.asset_name) FILTER (WHERE a.asset_name IS NOT NULL) as assets,
        array_agg(DISTINCT pt.task_name) FILTER (WHERE pt.task_name IS NOT NULL) as tasks
      FROM pm_plans pp
      LEFT JOIN pm_plan_assets pa ON pa.pm_plan_id = pp.id
      LEFT JOIN assets a ON a.id = pa.asset_id
      LEFT JOIN pm_plan_tasks pt ON pt.pm_plan_id = pp.id
      GROUP BY pp.id
      ORDER BY pp.id DESC
    `);
    res.json(plans.rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const createSchedulePlan = async (req, res) => {
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
};

const updateSchedulePlan = async (req, res) => {
  try {
    const { name, description, frequency_type, frequency_value, is_active } = req.body;
    const updated = await pool.query(
      "UPDATE pm_plans SET name=$1, description=$2, frequency_type=$3, frequency_value=$4, is_active=$5 WHERE id=$6 RETURNING *",
      [name, description, frequency_type, parseInt(frequency_value), is_active !== false, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

const deleteSchedulePlan = async (req, res) => {
  try {
    await pool.query("DELETE FROM pm_plans WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
};

module.exports = {
  getSchedulePlans,
  createSchedulePlan,
  updateSchedulePlan,
  deleteSchedulePlan
};
