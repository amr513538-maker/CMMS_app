const pool = require("../db");

const getReports = async (req, res) => {
  try {
    const { start, end, priority, status } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (start) { conditions.push(`mr.requested_at >= $${i++}`); params.push(start); }
    if (end) { conditions.push(`mr.requested_at <= $${i++}`); params.push(end); }
    if (priority) { conditions.push(`p.name = $${i++}`); params.push(priority); }
    if (status) { conditions.push(`mr.status = $${i++}`); params.push(status); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const summaryRes = await pool.query(`
      SELECT COUNT(*) as total FROM maintenance_requests mr
      LEFT JOIN priorities p ON p.id = mr.priority_id
      ${where}
    `, params);
    const total = parseInt(summaryRes.rows[0].total) || 0;

    const statusRes = await pool.query(`
      SELECT mr.status, COUNT(*) as count
      FROM maintenance_requests mr
      LEFT JOIN priorities p ON p.id = mr.priority_id
      ${where}
      GROUP BY mr.status
    `, params);
    const statuses = {};
    statusRes.rows.forEach(r => { statuses[r.status] = parseInt(r.count); });

    const priorityRes = await pool.query(`
      SELECT p.name as priority, COUNT(*) as count
      FROM maintenance_requests mr
      LEFT JOIN priorities p ON p.id = mr.priority_id
      ${where}
      GROUP BY p.name
    `, params);
    const priorities = {};
    priorityRes.rows.forEach(r => { priorities[r.priority || 'Unset'] = parseInt(r.count); });

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
      summary: { total, statuses, priorities },
      details: details.rows
    });
  } catch (err) {
    console.error("Reports error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const getReportsSummary = async (req, res) => {
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
};

module.exports = {
  getReports,
  getReportsSummary
};
