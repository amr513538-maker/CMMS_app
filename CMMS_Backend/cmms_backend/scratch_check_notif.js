const pool = require('./db');

async function check() {
  const email = 'mazenamr@gmail.com'; // IT Support
  const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRes.rows[0].id;
  
  const notifs = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [userId]);
  console.log('Latest notification for IT Support:', notifs.rows[0]);
  process.exit(0);
}
check();
