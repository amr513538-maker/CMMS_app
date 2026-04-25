const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function main() {
  console.log("🔄 Initializing CMMS Database...\n");

  const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("✅ Schema applied successfully!");

    // Verify
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`📊 Tables created: ${tables.rows.map(t => t.table_name).join(", ")}`);

    const roles = await client.query("SELECT name FROM roles ORDER BY id");
    console.log(`👥 Roles: ${roles.rows.map(r => r.name).join(", ")}`);

    const users = await client.query("SELECT email FROM users");
    console.log(`👤 Users: ${users.rows.map(u => u.email).join(", ")}`);

    console.log("\n🚀 Database ready! You can now start the server with: npm start");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ DB init failed:", err.message);
  process.exitCode = 1;
});
