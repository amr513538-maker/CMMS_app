const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:12345@localhost:5432/cmms_db' });

async function check() {
  try {
    const roles = await pool.query("SELECT * FROM roles");
    console.log("Roles Table:", roles.rows);
    
    const users = await pool.query("SELECT u.email, r.name as role FROM users u LEFT JOIN roles r ON r.id = u.role_id");
    console.log("All Users Roles:", users.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
