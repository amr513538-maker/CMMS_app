const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const maintenanceRequestController = require("../controllers/maintenanceRequestController");

router.post("/", authMiddleware, upload.single("image"), maintenanceRequestController.createRequest);
router.get("/", authMiddleware, maintenanceRequestController.getRequests);
router.get("/track/:code", authMiddleware, maintenanceRequestController.trackRequest);
router.post("/:id/events", authMiddleware, maintenanceRequestController.addEvent);
router.put("/:id/status", authMiddleware, maintenanceRequestController.updateStatus);
router.delete("/:id", authMiddleware, requireRole("admin"), maintenanceRequestController.deleteRequest);

module.exports = router;
