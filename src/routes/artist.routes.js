const express = require("express");
const router = express.Router();
const artistController = require("../controllers/artist.controller");

// list artists
router.get("/", artistController.getAllArtists);

// show create form
router.get("/create", artistController.showCreateForm);

// create artist
router.post("/create", artistController.createArtist);

// delete artist
router.post("/delete/:id", artistController.deleteArtist);

// show update form
router.get("/edit/:id", artistController.showEditForm);

// update artist
router.post("/edit/:id", artistController.updateArtist);

module.exports = router;
