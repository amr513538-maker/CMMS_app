const pool = require('./db');
const bcrypt = require('bcryptjs');

async function reset() {
  const hash = await bcrypt.hash('123456', 10);
  await pool.query("UPDATE users SET password_hash = $1 WHERE email IN ('dfsfsds@gmail.com', 'mazenamr@gmail.com')", [hash]);
  console.log('Passwords reset to 123456');
  process.exit(0);
}
reset();
