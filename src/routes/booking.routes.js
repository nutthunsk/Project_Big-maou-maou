const express = require("express");
const router = express.Router();
const controller = require("../controllers/booking.controller");

router.get("/", controller.index);
router.get("/new", controller.newForm);
router.post("/", controller.create);
router.get("/:id", controller.show);
router.get("/:id/edit", controller.editForm);
router.put("/:id", controller.update);
router.post("/:id/mark-paid", controller.markAsPaid);
router.post("/:id/mark-pending", controller.markAsPending);
router.delete("/:id", controller.delete);

module.exports = router;
