const http = require('http');

async function test() {
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@cmms.local", password: "admin123" })
  });
  const loginData = await loginRes.json();
  console.log("Login Token:", loginData.token ? "OK" : loginData);

  const statsRes = await fetch("http://localhost:5000/api/dashboard/stats", {
    headers: { "Authorization": "Bearer " + loginData.token }
  });
  const statsTxt = await statsRes.text();
  console.log("Stats Response:", statsRes.status, statsTxt);
}
test().catch(console.error);
