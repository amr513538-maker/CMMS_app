const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const scheduleController = require("../controllers/scheduleController");

router.get("/", authMiddleware, scheduleController.getSchedulePlans);
router.post("/", authMiddleware, requireRole("admin"), scheduleController.createSchedulePlan);
router.put("/:id", authMiddleware, requireRole("admin"), scheduleController.updateSchedulePlan);
router.delete("/:id", authMiddleware, requireRole("admin"), scheduleController.deleteSchedulePlan);

module.exports = router;
