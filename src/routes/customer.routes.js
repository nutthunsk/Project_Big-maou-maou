const express = require("express");
const router = express.Router();

const customerController = require("../controllers/customer.controller");

router.get("/", customerController.index);
router.post("/create", customerController.create);

module.exports = router;
