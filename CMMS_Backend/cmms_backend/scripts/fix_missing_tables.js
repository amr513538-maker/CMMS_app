const pool = require("../db");

async function fix() {
  const client = await pool.connect();
  try {
    console.log("🛠 Applying database fixes...");
    
    // Create buildings table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Buildings table checked/created.");

    // Add building (TEXT) column to labs if not exists
    await client.query(`
      ALTER TABLE labs ADD COLUMN IF NOT EXISTS building TEXT;
    `);
    console.log("✅ Building (TEXT) column checked/added to labs.");

    // Add department column to labs if not exists
    await client.query(`
      ALTER TABLE labs ADD COLUMN IF NOT EXISTS department TEXT;
    `);
    console.log("✅ Department column checked/added to labs.");

    // Add building_id column to labs if not exists
    await client.query(`
      ALTER TABLE labs ADD COLUMN IF NOT EXISTS building_id BIGINT REFERENCES buildings(id) ON DELETE SET NULL;
    `);
    console.log("✅ building_id column checked/added to labs.");

    console.log("🚀 Database fixes applied successfully!");
  } catch (err) {
    console.error("❌ Fix failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
