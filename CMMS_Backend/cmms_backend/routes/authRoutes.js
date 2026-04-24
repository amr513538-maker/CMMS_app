const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const upload = require("../middleware/upload");
const authController = require("../controllers/authController");

// Public Routes
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/register", authController.register);

// Protected Routes
router.get("/me", authMiddleware, authController.getMe);
router.put("/profile", authMiddleware, authController.updateProfile);
router.post("/profile/image", authMiddleware, upload.single("image"), authController.uploadProfileImage);
router.put("/password", authMiddleware, authController.updatePassword);

module.exports = router;
