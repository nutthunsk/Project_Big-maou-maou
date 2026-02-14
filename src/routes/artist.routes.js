const express = require("express");
const router = express.Router();
const artistController = require("../controllers/artist.controller");

// GET /artists
router.get("/", artistController.index);

// GET /artists/create
router.get("/create", artistController.createForm);

// POST /artists/create
router.post("/create", artistController.create);

// GET /artists/edit/:id
router.get("/edit/:id", artistController.editForm);

// POST /artists/edit/:id
router.post("/edit/:id", artistController.update);

// POST /artists/delete/:id
router.post("/delete/:id", artistController.delete);

module.exports = router;