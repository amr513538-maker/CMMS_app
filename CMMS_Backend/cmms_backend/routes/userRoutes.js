const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const userController = require("../controllers/userController");

router.post("/", authMiddleware, requireRole("admin"), userController.createUser);
router.put("/:id", authMiddleware, requireRole("admin"), userController.updateUser);
router.get("/", authMiddleware, requireRole("admin"), userController.getAllUsers);
router.get("/it-support", authMiddleware, userController.getITSupport);
router.post("/delete", authMiddleware, requireRole("admin"), userController.deleteUsersBatch);
router.delete("/:id", authMiddleware, requireRole("admin"), userController.deleteUser);

module.exports = router;
