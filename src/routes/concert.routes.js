const express = require("express");
const router = express.Router();
const concertController = require("../controllers/concert.controller");

// หน้าเว็บ
router.get("/", concertController.index);
router.get("/:id/book", concertController.showBookingForm);

// admin เพิ่ม concert
router.post("/", concertController.create);

module.exports = router;