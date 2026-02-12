const express = require("express");
const router = express.Router();
const concertController = require("../controllers/concert.controller");

router.get("/", concertController.getAll);
router.get("/create", concertController.createForm);
router.post("/create", concertController.create);

module.exports = router;
