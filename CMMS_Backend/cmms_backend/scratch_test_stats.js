const pool = require('./db');

async function test() {
  const email = 'mazenamr@gmail.com'; // IT Support
  const userRes = await pool.query("SELECT u.*, r.name as role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = $1", [email]);
  const user = userRes.rows[0];
  console.log('User Role:', user.role);

  let whereClause = "";
  if (user.role === 'user') {
    whereClause = "WHERE requested_by = " + user.id;
  }
  
  const recentRes = await pool.query(`SELECT id, title, status FROM maintenance_requests ${whereClause} ORDER BY requested_at DESC LIMIT 5`);
  console.log('Recent Requests for IT Support:', recentRes.rows);
  process.exit(0);
}
test();
