const express = require("express");
const router = express.Router();
const controller = require("../controllers/booking.controller");
const { requireUserLogin } = require("../utils/user-auth");

// Booking Routes
// แสดงรายการการจองทั้งหมด
router.get("/", controller.index);

// แสดงฟอร์มจองบัตร (ต้องล็อกอินก่อน)
router.get("/new", requireUserLogin, controller.newForm);

// สร้างรายการจองใหม่ (ต้องล็อกอินก่อน)
router.post("/", requireUserLogin, controller.create);

// แสดงรายละเอียดการจองตาม id
router.get("/:id", controller.show);

// แสดงฟอร์มแก้ไขข้อมูลการจอง
router.get("/:id/edit", controller.editForm);

// อัปเดตข้อมูลการจอง
router.put("/:id", controller.update);

// เปลี่ยนสถานะการจองเป็น paid
router.post("/:id/mark-paid", controller.markAsPaid);

// เปลี่ยนสถานะการจองกลับเป็น pending
router.post("/:id/mark-pending", controller.markAsPending);

// เปลี่ยนสถานะการจองกลับเป็น pending
router.delete("/:id", controller.delete);

module.exports = router;
