const { Artist } = require('../models');

// GET /artists
exports.getAllArtists = async (req, res) => {
  const artists = await Artist.findAll();
  res.render('artists/index', { artists });
};

// GET /artists/create
exports.showCreateForm = (req, res) => {
  res.render('artists/create');
};

// POST /artists/create
exports.createArtist = async (req, res) => {
  const { artistName, genre } = req.body;
  await Artist.create({ artistName, genre });
  res.redirect('/artists');
};

// POST /artists/delete/:id
exports.deleteArtist = async (req, res) => {
  await Artist.destroy({
    where: { id: req.params.id }
  });
  res.redirect('/artists');
};