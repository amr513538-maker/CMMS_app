const bcrypt = require('bcryptjs');
const pool = require('./db');

async function addAdmin() {
  try {
    const hash = await bcrypt.hash('admin', 10);
    const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
    const roleId = roleRes.rows[0].id;
    await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role_id, is_active) VALUES ('admin', 'admin', $1, $2, TRUE) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;", 
      [hash, roleId]
    );
    console.log('Admin added successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

addAdmin();
