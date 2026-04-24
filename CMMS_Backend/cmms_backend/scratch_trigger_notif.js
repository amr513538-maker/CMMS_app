const pool = require('./db');

async function trigger() {
  const userId = 2; // Normal User (dfsfsds@gmail.com)
  const reqCode = 'TESTNOTIF123';
  
  // 1. Get Priority
  const p = await pool.query("SELECT id FROM priorities WHERE name = 'High'");
  const pId = p.rows[0].id;

  // 2. Insert Request
  const inserted = await pool.query(
    `INSERT INTO maintenance_requests (request_code, title, description, priority_id, requested_by, status)
     VALUES ($1, $2, $3, $4, $5, 'New') RETURNING id`,
    [reqCode, 'طلب اختبار الإشعارات', 'وصف لاختبار وصول الإشعار للفنيين', pId, userId]
  );
  
  const reqId = inserted.rows[0].id;
  
  // 3. Trigger Notifications (Logic from controller)
  const technicians = await pool.query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'IT Support'");
  for (const tech of technicians.rows) {
    await pool.query("INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)",
      [tech.id, 'طلب صيانة وارد', `طلب صيانة جديد متاح: اختبار الإشعارات`, `/track/${reqCode}`]);
  }
  
  console.log('Test request created and notifications triggered.');
  process.exit(0);
}
trigger();
