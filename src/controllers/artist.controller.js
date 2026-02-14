const { Artist } = require("../models");

// GET /artists
exports.index = async (req, res) => {
  const artists = await Artist.findAll();
  res.render("artists/index", { artists });
};

// GET /artists/create
exports.createForm = (req, res) => {
  res.render("artists/create");
};

// POST /artists/create
exports.create = async (req, res) => {
  const { ArtistName, genre } = req.body;
  await Artist.create({ ArtistName, genre });
  res.redirect("/artists");
};

// GET /artists/edit/:id
exports.editForm = async (req, res) => {
  const artist = await Artist.findByPk(req.params.id);
  res.render("artists/edit", { artist });
};

// POST /artists/edit/:id
exports.update = async (req, res) => {
  const { ArtistName, genre } = req.body;
  await Artist.update(
    { ArtistName, genre },
    { where: { id: req.params.id } }
  );
  res.redirect("/artists");
};

// POST /artists/delete/:id
exports.delete = async (req, res) => {
  await Artist.destroy({ where: { id: req.params.id } });
  res.redirect("/artists");
};