const express = require("express");
const router = express.Router();
const concertController = require("../controllers/concert.controller");

router.get("/", concertController.index);
router.get("/create", concertController.showCreateForm);
router.post("/", concertController.create);
router.get("/:id/book", concertController.showBookingForm);

// 🔥 ลบคอนเสิร์ต
router.post("/:id/delete", concertController.delete);

module.exports = router;