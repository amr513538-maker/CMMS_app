const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.js');
let content = fs.readFileSync(indexPath, 'utf-8');

const regex = /\/\/ --------------------------------------------------------\r?\n\/\/ 10\. Notifications Routes[\s\S]*?(?=\/\/ --------------------------------------------------------\r?\n\/\/ 9\. Server Start)/;

const replacements = `
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/schedule", require("./routes/scheduleRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/job-titles", require("./routes/jobTitleRoutes"));

`;

content = content.replace(regex, replacements);

fs.writeFileSync(indexPath, content, 'utf-8');
console.log("Final routes refactored successfully in index.js!");
