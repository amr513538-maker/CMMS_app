const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:12345@localhost:5432/cmms_db' });

async function run() {
  try {
    // 1. Rename existing roles if they exist under old names
    await pool.query("UPDATE roles SET name = 'IT Support' WHERE name = 'technician'");
    await pool.query("UPDATE roles SET name = 'user' WHERE name = 'requester'");
    
    // 2. Ensure they exist (Upsert)
    await pool.query("INSERT INTO roles (name, description) VALUES ('admin', 'System administrator') ON CONFLICT (name) DO NOTHING");
    await pool.query("INSERT INTO roles (name, description) VALUES ('user', 'Standard User') ON CONFLICT (name) DO NOTHING");
    await pool.query("INSERT INTO roles (name, description) VALUES ('IT Support', 'Maintenance Technician') ON CONFLICT (name) DO NOTHING");

    console.log('Database Role Migration Complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
