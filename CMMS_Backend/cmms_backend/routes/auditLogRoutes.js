const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const auditLogController = require("../controllers/auditLogController");

router.get("/", authMiddleware, requireRole("admin"), auditLogController.getAuditLogs);

module.exports = router;
