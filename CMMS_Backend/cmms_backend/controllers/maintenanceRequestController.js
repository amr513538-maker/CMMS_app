const pool = require("../db");

const createRequest = async (req, res) => {
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

    const admins = await pool.query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin'");
    for (const admin of admins.rows) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)",
        [admin.id, 'طلب صيانة جديد', `طلب جديد: ${title || issueDescription.substring(0, 40)}`, `/track/${reqCode}`]);
    }

    const technicians = await pool.query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'IT Support'");
    for (const tech of technicians.rows) {
      // Don't notify if they are already being notified via the 'assignedId' check below
      if (assignedId && tech.id === assignedId) continue; 
      
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)",
        [tech.id, 'طلب صيانة وارد', `طلب صيانة جديد متاح: ${title || issueDescription.substring(0, 40)}`, `/track/${reqCode}`]);
    }

    if (assignedId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)",
        [assignedId, 'تكليف بمهمة جديدة', `تم تكليفك بطلب صيانة: ${title || issueDescription.substring(0, 40)}`, `/track/${reqCode}`]);
    }

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error("Error creating maintenance request:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const getRequests = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = Number(req.user.sub);
    let condition = "";
    let params = [];

    if (role === "user") {
      condition = "WHERE mr.requested_by = $1";
      params.push(userId);
    }

    const rows = await pool.query(
      `SELECT mr.id, mr.request_code, mr.title, mr.location, mr.asset_name, mr.description, p.name AS priority, mr.status, mr.requested_at, u.full_name as assigned_to
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
};

const trackRequest = async (req, res) => {
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
};

const statusTranslations = {
  'New': 'جديد',
  'Pending': 'معلق',
  'In Progress': 'قيد التنفيذ',
  'Done': 'مكتمل'
};

const notifyOnStatusChange = async (reqId, newStatus, actorUserId) => {
  try {
    const req = await pool.query("SELECT requested_by, assigned_to, request_code, title FROM maintenance_requests WHERE id = $1", [reqId]);
    if (req.rows.length === 0) return;
    const r = req.rows[0];
    const translatedStatus = statusTranslations[newStatus] || newStatus;
    const msg = `تم تحديث حالة الطلب ${r.request_code} إلى: ${translatedStatus}`;
    const link = `/track/${r.request_code}`;

    if (r.requested_by && r.requested_by !== actorUserId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
        [r.requested_by, 'تحديث حالة الطلب', msg, link]);
    }
    if (r.assigned_to && r.assigned_to !== actorUserId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
        [r.assigned_to, 'تحديث حالة الطلب', msg, link]);
    }
  } catch (e) { console.error('Notify error:', e.message); }
};

const notifyOnAssignment = async (reqId, techId, actorUserId) => {
  try {
    const r = await pool.query("SELECT requested_by, request_code, title FROM maintenance_requests WHERE id = $1", [reqId]);
    if (r.rows.length === 0) return;
    const req = r.rows[0];
    const link = `/track/${req.request_code}`;
    
    await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
      [techId, 'تم تكليفك بطلب صيانة', `تم تكليفك بالطلب: ${req.request_code}`, link]);
      
    if (req.requested_by && req.requested_by !== actorUserId) {
       const techRow = await pool.query("SELECT full_name FROM users WHERE id = $1", [techId]);
       const techName = techRow.rows[0]?.full_name || "فني";
       await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
         [req.requested_by, 'تم تعيين فني لطلبك', `تم تعيين الفني ${techName} لمعالجة طلبك رقم ${req.request_code}`, link]);
    }
  } catch (e) { console.error('Notify error:', e.message); }
};

const notifyOnComment = async (reqId, commentText, actorUserId) => {
  try {
    const req = await pool.query("SELECT requested_by, assigned_to, request_code FROM maintenance_requests WHERE id = $1", [reqId]);
    if (req.rows.length === 0) return;
    const r = req.rows[0];
    const link = `/track/${r.request_code}`;
    const actorRow = await pool.query("SELECT full_name FROM users WHERE id = $1", [actorUserId]);
    const actorName = actorRow.rows[0]?.full_name || "شخص ما";
    const msg = `تعليق جديد من ${actorName}: ${commentText.substring(0, 50)}...`;

    if (r.requested_by && r.requested_by !== actorUserId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
        [r.requested_by, 'تعليق جديد على طلبك', msg, link]);
    }
    if (r.assigned_to && r.assigned_to !== actorUserId) {
      await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1,$2,$3,$4)",
        [r.assigned_to, 'تعليق جديد على مهمة', msg, link]);
    }
  } catch (e) { console.error('Notify error:', e.message); }
};

const addEvent = async (req, res) => {
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
      if (role === "user") return res.status(403).json({ error: "Access Denied" });

      let dateQuery = "";
      if (new_status === "In Progress") dateQuery = ", started_at = NOW()";
      if (new_status === "Done") dateQuery = ", completed_at = NOW()";

      const translatedStatus = statusTranslations[new_status] || new_status;
      await pool.query(`UPDATE maintenance_requests SET status = $1 ${dateQuery} WHERE id = $2`, [new_status, reqId]);
      await pool.query(
        `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'status_change', $3)`,
        [reqId, userId, `تم تغيير الحالة إلى: ${translatedStatus}`]
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
      await notifyOnComment(reqId, message, userId);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const updateStatus = async (req, res) => {
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

      const translatedStatus = statusTranslations[status] || status;
      await pool.query(`UPDATE maintenance_requests SET status = $1 ${dateQuery} WHERE id = $2`, [status, reqId]);
      await pool.query(
        `INSERT INTO request_events (request_id, user_id, event_type, message) VALUES ($1, $2, 'status_change', $3)`,
        [reqId, userId, `تم تغيير الحالة إلى: ${translatedStatus}`]
      );
      await notifyOnStatusChange(reqId, status, userId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating status:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM request_events WHERE request_id = $1", [id]);
    const result = await pool.query("DELETE FROM maintenance_requests WHERE id = $1 RETURNING request_code", [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "الطلب غير موجود" });

    res.json({ success: true, message: "تم حذف الطلب بنجاح" });
  } catch (err) {
    console.error("Error deleting request:", err.message);
    res.status(500).json({ error: "لا يمكن حذف الطلب لوجود بيانات مرتبطة به" });
  }
};

module.exports = {
  createRequest,
  getRequests,
  trackRequest,
  addEvent,
  updateStatus,
  deleteRequest
};
