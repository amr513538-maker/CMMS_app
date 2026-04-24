const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const labController = require("../controllers/labController");

router.get("/", authMiddleware, labController.getLabs);
router.post("/", authMiddleware, requireRole("admin"), labController.createLab);
router.put("/:id", authMiddleware, requireRole("admin"), labController.updateLab);
router.delete("/:id", authMiddleware, requireRole("admin"), labController.deleteLab);

module.exports = router;
