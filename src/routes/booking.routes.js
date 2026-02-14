const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");

router.get("/", bookingController.index);
router.post("/create", bookingController.create);
router.post("/pay/:id", bookingController.pay);

module.exports = router;
