const pool = require("../db");
require("dotenv").config();

async function migrate() {
  try {
    console.log("=== Migration: Buildings System ===");

    // 1. Create buildings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ buildings table created");

    // 2. Seed existing buildings from labs data
    const existingBuildings = await pool.query(
      "SELECT DISTINCT building FROM labs WHERE building IS NOT NULL AND building != ''"
    );
    for (const row of existingBuildings.rows) {
      await pool.query(
        "INSERT INTO buildings (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [row.building]
      );
    }
    console.log("✅ Seeded", existingBuildings.rows.length, "buildings from existing labs data");

    // 3. Ensure labs has building column (already done in previous migration)
    // and device_count will be computed via JOIN, not stored

    console.log("=== Migration completed successfully ===");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

migrate();
