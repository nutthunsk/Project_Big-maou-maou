const { Concert, Artist } = require("../models");

exports.getAll = async (req, res) => {
  const concerts = await Concert.findAll({ include: Artist });
  res.render("concerts/index", { concerts });
};

exports.createForm = async (req, res) => {
  const artists = await Artist.findAll();
  res.render("concerts/create", { artists });
};

exports.create = async (req, res) => {
  const { concertName, concertDate, venue, ArtistId } = req.body;
  await Concert.create({ concertName, concertDate, venue, ArtistId });
  res.redirect("/concerts");
};
