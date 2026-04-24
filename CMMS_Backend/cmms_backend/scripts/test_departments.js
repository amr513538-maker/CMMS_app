const pool = require("../db");
const jwt = require("jsonwebtoken");
const http = require("http");
require("dotenv").config();

async function test() {
  // Find admin user
  const res = await pool.query(
    "SELECT u.id, u.email, r.name as role FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE r.name = $1 LIMIT 1",
    ["admin"]
  );
  const user = res.rows[0];
  console.log("Admin user:", user);

  if (!user) {
    console.log("No admin user found!");
    pool.end();
    return;
  }

  const token = jwt.sign(
    { sub: String(user.id), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const opts = {
    hostname: "localhost",
    port: 5000,
    path: "/api/departments",
    headers: { Authorization: "Bearer " + token },
  };

  http
    .get(opts, (r) => {
      let data = "";
      r.on("data", (d) => (data += d));
      r.on("end", () => {
        console.log("Status:", r.statusCode);
        console.log("Response:", data);
        pool.end();
        process.exit(0);
      });
    })
    .on("error", (e) => {
      console.log("Server not running:", e.message);
      console.log("(This is OK - just means server needs to be started)");
      pool.end();
      process.exit(0);
    });
}

test().catch((e) => {
  console.error(e.message);
  pool.end();
  process.exit(1);
});
