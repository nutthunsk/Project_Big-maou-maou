const express = require("express");
const router = express.Router();
const controller = require("../controllers/report.controller");

router.get("/concert-sales", controller.concertSales);
router.get("/customer-spending", controller.customerSpending);

module.exports = router;