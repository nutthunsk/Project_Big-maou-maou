const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artist.controller');

// list artists
router.get('/', artistController.getAllArtists);

// show create form
router.get('/create', artistController.showCreateForm);

// create artist
router.post('/create', artistController.createArtist);

// delete artist
router.post('/delete/:id', artistController.deleteArtist);

module.exports = router;