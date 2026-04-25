const pool = require("../db");
const controller = require("../controllers/maintenanceRequestController");

async function runTest() {
  const client = await pool.connect();
  try {
    console.log("🛠️ Starting Notification Test...");
    
    // 1. Create a dummy requester user
    const userRes = await client.query(`
      INSERT INTO users (full_name, email, password_hash, is_active) 
      VALUES ('Test User', 'testuser@example.com', 'hash', true) 
      ON CONFLICT (email) DO UPDATE SET full_name = 'Test User'
      RETURNING id
    `);
    const requesterId = userRes.rows[0].id;
    console.log("✅ Created mock requester (User ID: " + requesterId + ")");

    // 1b. Create a dummy admin user
    const adminRes = await client.query(`
      INSERT INTO users (full_name, email, password_hash, is_active) 
      VALUES ('Test Admin', 'testadmin@example.com', 'hash', true) 
      ON CONFLICT (email) DO UPDATE SET full_name = 'Test Admin'
      RETURNING id
    `);
    const adminId = adminRes.rows[0].id;

    // 2. Create a dummy maintenance request assigned to this user
    const reqRes = await client.query(`
      INSERT INTO maintenance_requests (request_code, description, requested_by, status) 
      VALUES ('TEST-REQ-001', 'Test issue', $1, 'New') 
      ON CONFLICT (request_code) DO UPDATE SET status = 'New'
      RETURNING id
    `, [requesterId]);
    const reqId = reqRes.rows[0].id;
    console.log("✅ Created mock maintenance request (Request ID: " + reqId + ")");

    // Clear previous test notifications for this user
    await client.query("DELETE FROM notifications WHERE user_id = $1", [requesterId]);

    // 3. Simulate an Admin updating the status to 'In Progress'
    console.log("🔄 Admin is updating the status to 'In Progress'...");
    
    const req = {
      params: { id: reqId },
      user: { sub: adminId, role: 'admin' }, // Simulated admin using a valid ID
      body: { status: 'In Progress' }
    };
    
    const res = {
      status: function(s) { this.statusCode = s; return this; },
      json: function(data) { this.data = data; return this; }
    };

    await controller.updateStatus(req, res);
    console.log("Response from updateStatus:", res.statusCode, res.data);
    
    // 4. Verify notification was created ONLY for the requester
    const notifs = await client.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [requesterId]);
    
    if (notifs.rows.length > 0) {
      console.log("\n🎉 SUCCESS: Notification found for the requester!");
      console.log("   Title:", notifs.rows[0].title);
      console.log("   Message:", notifs.rows[0].message);
    } else {
      console.log("\n❌ FAILED: No notification found for the requester.");
    }

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    // Cleanup
    await client.query("DELETE FROM maintenance_requests WHERE request_code = 'TEST-REQ-001'");
    await client.query("DELETE FROM users WHERE email = 'testuser@example.com'");
    client.release();
    await pool.end();
  }
}

runTest();
