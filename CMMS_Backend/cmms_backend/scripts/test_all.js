const pool = require("../db");
const jwt = require("jsonwebtoken");
const http = require("http");
require("dotenv").config();

async function test() {
  // Get admin
  const adminRes = await pool.query("SELECT u.id, r.name as role FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE r.name='admin' LIMIT 1");
  const admin = adminRes.rows[0];
  if (!admin) { console.log("❌ No admin found"); await pool.end(); return; }
  
  const token = jwt.sign({ sub: String(admin.id), role: admin.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  
  function apiCall(method, path, body) {
    return new Promise((resolve, reject) => {
      const opts = { hostname: "localhost", port: 5000, path, method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" } };
      const req = http.request(opts, r => {
        let data = ""; r.on("data", d => data += d);
        r.on("end", () => { try { resolve({ status: r.statusCode, data: JSON.parse(data) }); } catch { resolve({ status: r.statusCode, data }); } });
      });
      req.on("error", reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  console.log("=== TESTING CMMS APIs ===\n");

  // 1. Test Buildings
  console.log("--- Buildings ---");
  let r = await apiCall("POST", "/api/buildings", { name: "B1" });
  console.log("Add B1:", r.status, r.status === 201 ? "✅" : "⚠️ " + JSON.stringify(r.data));
  r = await apiCall("POST", "/api/buildings", { name: "B2" });
  console.log("Add B2:", r.status, r.status === 201 ? "✅" : "⚠️ " + JSON.stringify(r.data));
  r = await apiCall("GET", "/api/buildings");
  console.log("List buildings:", r.status, "✅", r.data.length, "buildings:", r.data.map(b => b.name).join(", "));

  // 2. Test Departments
  console.log("\n--- Departments ---");
  r = await apiCall("GET", "/api/departments");
  console.log("List departments:", r.status, "✅", r.data.length, "depts:", r.data.map(d => d.name).join(", "));

  // 3. Test Labs
  console.log("\n--- Labs ---");
  r = await apiCall("POST", "/api/labs", { name: "معمل حاسب 101", building: "B1", department: r.data[0]?.name || "عام" });
  console.log("Add lab:", r.status, r.status === 201 ? "✅" : "⚠️ " + JSON.stringify(r.data));
  const labId = r.data?.id;
  r = await apiCall("GET", "/api/labs");
  console.log("List labs:", r.status, "✅", r.data.length, "labs. device_count present:", r.data[0]?.device_count !== undefined ? "✅" : "❌");

  // 4. Test Devices
  console.log("\n--- Devices ---");
  if (labId) {
    r = await apiCall("POST", "/api/devices", { name: "PC-01", type: "Desktop", status: "Active", lab_id: labId });
    console.log("Add device:", r.status, r.status === 201 ? "✅" : "⚠️ " + JSON.stringify(r.data));
    r = await apiCall("GET", "/api/devices");
    console.log("List devices:", r.status, "✅", r.data.length, "devices. lab_name present:", r.data[0]?.lab_name ? "✅" : "❌");
  }

  // 5. Test Labs with filter
  console.log("\n--- Labs filter ---");
  r = await apiCall("GET", "/api/labs?building=B1");
  console.log("Filter labs by B1:", r.status, "✅", r.data.length, "labs in B1");

  console.log("\n=== ALL TESTS DONE ===");
  await pool.end();
  process.exit(0);
}

test().catch(e => { console.error("❌", e.message); process.exit(1); });
