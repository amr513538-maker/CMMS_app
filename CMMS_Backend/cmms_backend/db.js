const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Auto-migrate missing schema
const autoMigrate = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    // Add columns if they don't exist
    const addCol = async (table, col, def) => {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def}`);
      } catch (e) {
        // Ignore if exists
      }
    };
    
    await addCol('labs', 'building', 'TEXT');
    await addCol('labs', 'department', 'TEXT');
    await addCol('labs', 'building_id', 'BIGINT REFERENCES buildings(id) ON DELETE SET NULL');
    
    console.log("✅ Auto-migration completed: Schema is up-to-date.");
  } catch (err) {
    console.error("❌ Auto-migration failed:", err.message);
  }
};

autoMigrate();

module.exports = pool;