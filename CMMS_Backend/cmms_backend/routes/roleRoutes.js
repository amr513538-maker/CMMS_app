const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const roleController = require("../controllers/roleController");

router.get("/", authMiddleware, requireRole("admin"), roleController.getRoles);
router.post("/", authMiddleware, requireRole("admin"), roleController.createRole);
router.put("/:id", authMiddleware, requireRole("admin"), roleController.updateRole);
router.delete("/:id", authMiddleware, requireRole("admin"), roleController.deleteRole);

module.exports = router;
