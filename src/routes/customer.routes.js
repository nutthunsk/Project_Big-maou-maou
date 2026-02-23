const express = require("express");
const router = express.Router();
const controller = require("../controllers/customer.controller");

// Customer Routes

// แสดงรายชื่อลูกค้าทั้งหมด
router.get("/", controller.index);

// แสดงฟอร์มเพิ่มลูกค้าใหม่
router.get("/new", controller.newForm);

// บันทึกข้อมูลลูกค้าใหม่
router.post("/", controller.create);

// แสดงรายละเอียดลูกค้าตาม id
router.get("/:id", controller.show);

// แสดงฟอร์มแก้ไขข้อมูลลูกค้า
router.get("/:id/edit", controller.editForm);

// อัปเดตข้อมูลลูกค้า
router.put("/:id", controller.update);

// ลบข้อมูลลูกค้า
router.delete("/:id", controller.delete);

module.exports = router;
