const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function main() {
  const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("DB init complete: schema.sql applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("DB init failed:", err);
  process.exitCode = 1;
});

