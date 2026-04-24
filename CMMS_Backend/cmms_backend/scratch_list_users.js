const pool = require('./db');
async function check() {
  const res = await pool.query(`
    SELECT u.email, u.full_name, r.name as role 
    FROM users u 
    JOIN roles r ON r.id = u.role_id
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
check();
