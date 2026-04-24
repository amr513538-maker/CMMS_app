const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const jobTitleController = require("../controllers/jobTitleController");

router.get("/", authMiddleware, jobTitleController.getJobTitles);
router.post("/", authMiddleware, requireRole("admin"), jobTitleController.createJobTitle);
router.put("/:id", authMiddleware, requireRole("admin"), jobTitleController.updateJobTitle);
router.delete("/:id", authMiddleware, requireRole("admin"), jobTitleController.deleteJobTitle);

module.exports = router;
