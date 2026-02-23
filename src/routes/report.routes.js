const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");

// GET /reports
// แสดงหน้ารายงานสรุปข้อมูล (คอนเสิร์ต / ลูกค้า / ศิลปิน)
router.get("/", reportController.index);

module.exports = router;
