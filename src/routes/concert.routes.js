const express = require("express");
const router = express.Router();
const concertController = require("../controllers/concert.controller");

// หน้าแสดงคอนเสิร์ต
router.get("/", concertController.index);

// หน้า admin เพิ่มคอนเสิร์ต
router.get("/create", concertController.showCreateForm);

// action เพิ่มคอนเสิร์ต
router.post("/", concertController.create);

// หน้า booking
router.get("/:id/book", concertController.showBookingForm);

module.exports = router;