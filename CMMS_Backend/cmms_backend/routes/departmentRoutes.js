const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const departmentController = require("../controllers/departmentController");

router.get("/", authMiddleware, departmentController.getDepartments);
router.post("/", authMiddleware, requireRole("admin"), departmentController.createDepartment);
router.delete("/:id", authMiddleware, requireRole("admin"), departmentController.deleteDepartment);

module.exports = router;
