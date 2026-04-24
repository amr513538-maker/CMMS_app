const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const buildingController = require("../controllers/buildingController");

router.get("/", authMiddleware, buildingController.getBuildings);
router.post("/", authMiddleware, requireRole("admin"), buildingController.createBuilding);
router.put("/:id", authMiddleware, requireRole("admin"), buildingController.updateBuilding);
router.delete("/:id", authMiddleware, requireRole("admin"), buildingController.deleteBuilding);

module.exports = router;
