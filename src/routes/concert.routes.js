const express = require("express");
const router = express.Router();
const controller = require("../controllers/concert.controller");

// Concert Routes
// แสดงรายการคอนเสิร์ตทั้งหมด
router.get("/", controller.index);

// แสดงฟอร์มเพิ่มคอนเสิร์ต
router.get("/new", controller.newForm);

// บันทึกข้อมูลคอนเสิร์ตใหม่
router.post("/", controller.create);

// แสดงฟอร์มจองบัตรของคอนเสิร์ตที่เลือก
router.get("/:id/book", controller.bookForm);

// แสดงรายละเอียดคอนเสิร์ตตาม id
router.get("/:id", controller.show);

// แสดงฟอร์มแก้ไขข้อมูลคอนเสิร์ต
router.get("/:id/edit", controller.editForm);

// อัปเดตข้อมูลคอนเสิร์ต
router.put("/:id", controller.update);

// ลบข้อมูลคอนเสิร์ต
router.delete("/:id", controller.delete);

module.exports = router;
