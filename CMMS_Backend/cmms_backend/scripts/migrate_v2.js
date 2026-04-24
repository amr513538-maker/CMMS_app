const pool = require('../db');

async function migrate() {
  try {
    await pool.query(`
      -- Add new columns to maintenance_requests
      ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS device_id INT REFERENCES devices(id) ON DELETE SET NULL;
      ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS lab_id INT REFERENCES labs(id) ON DELETE SET NULL;

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    `);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
