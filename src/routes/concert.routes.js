const express = require("express");
const router = express.Router();
const controller = require("../controllers/concert.controller");

router.get("/", controller.index);
router.get("/new", controller.newForm);
router.post("/", controller.create);
router.get("/:id", controller.show);
router.get("/:id/edit", controller.editForm);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

module.exports = router;