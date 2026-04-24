const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboardController");

router.get("/stats", authMiddleware, dashboardController.getStats);
router.get("/admin-stats", authMiddleware, requireRole("admin"), dashboardController.getAdminStats);

module.exports = router;
