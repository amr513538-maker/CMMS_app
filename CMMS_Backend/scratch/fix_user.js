const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:12345@localhost:5432/cmms_db' });

async function run() {
  try {
    const res = await pool.query("UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'user') WHERE email = 'mazenanr4@gmail.com'");
    console.log(`Updated ${res.rowCount} user(s)`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
