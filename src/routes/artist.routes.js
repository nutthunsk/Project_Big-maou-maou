const express = require("express");
const router = express.Router();
const controller = require("../controllers/artist.controller");

// Artist Routes (RESTful)
// แสดงรายการศิลปินทั้งหมด
router.get("/", controller.index);

// แสดงฟอร์มเพิ่มศิลปิน
router.get("/new", controller.newForm);

// บันทึกข้อมูลศิลปินใหม่
router.post("/", controller.create);

// แสดงรายละเอียดศิลปินตาม id
router.get("/:id", controller.show);

// แสดงฟอร์มแก้ไขข้อมูลศิลปิน
router.get("/:id/edit", controller.editForm);

// อัปเดตข้อมูลศิลปิน
router.put("/:id", controller.update);

// ลบข้อมูลศิลปิน (ใช้กรณีฟอร์มไม่รองรับ DELETE)
router.post("/:id/delete", controller.delete);

// ลบข้อมูลศิลปิน (ตาม RESTful API)
router.delete("/:id", controller.delete);

module.exports = router;
