const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const reportController = require("../controllers/reportController");

router.get("/", authMiddleware, requireRole("admin", "planner"), reportController.getReports);
router.get("/summary", authMiddleware, requireRole("admin"), reportController.getReportsSummary);

module.exports = router;
