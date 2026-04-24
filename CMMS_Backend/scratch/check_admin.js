const pool = require('../db');

async function check() {
  try {
    const r = await pool.query(
      "SELECT u.id, u.email, u.full_name, u.is_active, (u.password_hash IS NOT NULL) as has_password, r.name as role FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.email = 'admin'"
    );
    console.log("Admin user:", JSON.stringify(r.rows, null, 2));
    
    if (r.rows.length > 0 && r.rows[0].has_password) {
      const bcrypt = require('bcryptjs');
      const user = await pool.query("SELECT password_hash FROM users WHERE email = 'admin'");
      const match = await bcrypt.compare('admin', user.rows[0].password_hash);
      console.log("Password 'admin' matches:", match);
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
check();
