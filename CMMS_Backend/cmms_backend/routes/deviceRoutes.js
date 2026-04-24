const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const deviceController = require("../controllers/deviceController");

router.get("/", authMiddleware, deviceController.getDevices);
router.get("/all", authMiddleware, deviceController.getAllDevicesITSupport);
router.get("/:labId", authMiddleware, deviceController.getDevicesByLab);
router.post("/", authMiddleware, requireRole("admin"), deviceController.createDevice);
router.put("/:id", authMiddleware, requireRole("admin"), deviceController.updateDevice);
router.put("/:id/status", authMiddleware, deviceController.updateDeviceStatus);
router.delete("/:id", authMiddleware, requireRole("admin"), deviceController.deleteDevice);

module.exports = router;
