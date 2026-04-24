const pool = require("../db");

const getStats = async (req, res) => {
  try {
    const userId = Number(req.user.sub);
    const role = req.user.role;
    let whereClause = "";
    let params = [];

    if (role === 'user') {
      whereClause = "WHERE requested_by = $1";
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

    const userRes = await pool.query("SELECT COUNT(*) as count FROM users");
    const userCount = parseInt(userRes.rows[0].count) || 0;

    const breakdownRes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Done') as completed,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE status IN ('New', 'Assigned')) as scheduled,
        COUNT(*) FILTER (WHERE status = 'Cancelled') as closed,
        COUNT(*) FILTER (WHERE status NOT IN ('Done', 'Cancelled') AND requested_at < NOW() - INTERVAL '3 days') as delayed,
        COUNT(*) as total_count
      FROM maintenance_requests ${whereClause}
    `, params);

    const b = breakdownRes.rows[0];
    const total = parseInt(b.total_count) || 1; // avoid division by zero

    res.json({
      kpis: {
        total: parseInt(b.total_count) || 0,
        open: parseInt(b.scheduled) || 0,
        inProgress: parseInt(b.in_progress) || 0,
        done: parseInt(b.completed) || 0,
        userCount
      },
      breakdown: {
        completed: { count: parseInt(b.completed), percent: Math.round((parseInt(b.completed) / total) * 100) },
        inProgress: { count: parseInt(b.in_progress), percent: Math.round((parseInt(b.in_progress) / total) * 100) },
        delayed: { count: parseInt(b.delayed), percent: Math.round((parseInt(b.delayed) / total) * 100) },
        scheduled: { count: parseInt(b.scheduled), percent: Math.round((parseInt(b.scheduled) / total) * 100) },
        closed: { count: parseInt(b.closed), percent: Math.round((parseInt(b.closed) / total) * 100) },
      },
      recentRequests: recentRes.rows
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

const getAdminStats = async (req, res) => {
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
};

module.exports = {
  getStats,
  getAdminStats
};
