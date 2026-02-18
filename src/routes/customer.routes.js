const express = require("express");
const router = express.Router();

const customerController = require("../controllers/customer.controller");

router.get("/", customerController.index);
router.get("/report", customerController.report);
router.get("/api", customerController.api);
router.post("/create", customerController.create);
router.post("/:id/delete", customerController.delete);

module.exports = router;
