const { Artist, Concert, Booking } = require("../models");

// GET /artists
const cleanText = (value) => String(value || "").trim();
const normalizeArtistName = (value) => cleanText(value).toUpperCase();

exports.index = async (_req, res) => {
  try {
    const artists = await Artist.findAll({
      include: [{ association: "Concerts", through: { attributes: [] } }],
      order: [["id", "ASC"]],
    });
    return res.render("artists/index", { artists });
  } catch (err) {
    console.error("Artist index error:", err);
    return res.redirect("/artists?error=Unable to load artist information");
  }
};

// GET /artists/create
exports.show = async (req, res) => {
  try {
    const artist = await Artist.findByPk(req.params.id, {
      include: [{ association: "Concerts", through: { attributes: [] } }],
    });
    if (!artist) return res.status(404).send("Artist not found");
    return res.render("artists/show", { artist });
  } catch (err) {
    console.error("Artist show error:", err);
    return res.redirect("/artists?error=Unable to load artist details");
  }
};

// POST /artists/create
exports.create = async (req, res) => {
  try {
    const ArtistName = normalizeArtistName(req.body.ArtistName);
    const genre = cleanText(req.body.genre);

    if (!ArtistName || !genre) {
      return res.redirect("/artists/new?error=Please fill out the information completely");
    }

    const duplicatedArtist = await Artist.findOne({ where: { ArtistName } });
    if (duplicatedArtist) {
      return res.redirect("/artists/new?error=This artist's name already exists");
    }

    await Artist.create({ ArtistName, genre });
    return res.redirect("/artists?success=Artist added successfully");
  } catch (err) {
    console.error("Artist create error:", err);
    return res.redirect("/artists/new?error=Unable to add artists");
  }
};

// GET /artists/edit/:id
exports.newForm = (_req, res) => res.render("artists/create");
exports.editForm = async (req, res) => {
  try {
    const artist = await Artist.findByPk(req.params.id);
    if (!artist) return res.status(404).send("Artist not found");
    return res.render("artists/edit", { artist });
  } catch (err) {
    console.error("Artist edit form error:", err);
    return res.redirect("/artists?error=The artist editing page cannot be opened");
  }
};

// POST /artists/edit/:id
exports.update = async (req, res) => {
  try {
    const artist = await Artist.findByPk(req.params.id);
    if (!artist) return res.status(404).send("Artist not found");

    const ArtistName = normalizeArtistName(req.body.ArtistName);
    const genre = cleanText(req.body.genre);

    if (!ArtistName || !genre) {
      return res.redirect(
        `/artists/${artist.id}/edit?error=Please fill out the information completely`,
      );
    }

    const duplicatedArtist = await Artist.findOne({ where: { ArtistName } });
    if (duplicatedArtist && Number(duplicatedArtist.id) !== Number(artist.id)) {
      return res.redirect(
        `/artists/${artist.id}/edit?error=This artist's name already exists`,
      );
    }

    await artist.update({ ArtistName, genre });
    return res.redirect(
      `/artists/${artist.id}?success=The artist information has been edited`,
    );
  } catch (err) {
    console.error("Artist update error:", err);
    return res.redirect(
      `/artists/${req.params.id}/edit?error=Unable to edit artist`,
    );
  }
};

// POST /artists/delete/:id
exports.delete = async (req, res) => {
  try {
    const artist = await Artist.findByPk(req.params.id, {
      include: [{ association: "Concerts", through: { attributes: [] } }],
    });
    if (!artist) return res.status(404).send("Artist not found");

    const primaryConcerts = await Concert.findAll({
      where: { ArtistId: artist.id },
      include: [{ association: "Artists", through: { attributes: [] } }],
    });

    for (const concert of primaryConcerts) {
      const fallbackArtist = (concert.Artists || []).find(
        (a) => Number(a.id) !== Number(artist.id),
      );

      if (!fallbackArtist) {
        await concert.setArtists([]);
        await Booking.destroy({ where: { ConcertId: concert.id } });
        await concert.destroy();
        continue;
      }

      await concert.update({ ArtistId: fallbackArtist.id });
    }

    await artist.setConcerts([]);
    await artist.destroy();
    return res.redirect("/artists?success=Artist successfully deleted");
  } catch (err) {
    console.error("Artist delete error:", err);
    return res.redirect("/artists?error=Unable to delete artist");
  }
};
