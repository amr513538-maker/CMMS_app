const pool = require("../db");

async function migrate() {
  try {
    console.log("Starting migration: Adding columns to labs table...");
    
    // Add department column if not exists
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='labs' AND column_name='department') THEN
          ALTER TABLE labs ADD COLUMN department TEXT;
        END IF;
      END $$;
    `);

    // Add building column if not exists
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='labs' AND column_name='building') THEN
          ALTER TABLE labs ADD COLUMN building TEXT;
        END IF;
      END $$;
    `);

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
