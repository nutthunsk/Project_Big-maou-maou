const { Concert, Artist } = require("../models");

// GET /concerts → หน้าเว็บแสดงคอนเสิร์ต
exports.index = async (req, res) => {
  try {
    const concerts = await Concert.findAll({
      include: Artist,
    });
    res.render("concerts/index", { concerts });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// GET /concerts/:id/book → หน้า form จองบัตร
exports.showBookingForm = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id, {
      include: Artist,
    });
    if (!concert) {
      return res.status(404).send("Concert not found");
    }
    res.render("concerts/book", { concert });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// POST /concerts → (admin) เพิ่มคอนเสิร์ต
exports.create = async (req, res) => {
  try {
    const {
      ConcertName,
      venue,
      ConcertDate,
      totalSeats,
      price,
      ArtistId,
    } = req.body;

    await Concert.create({
      ConcertName,
      venue,
      ConcertDate,
      totalSeats,
      price,
      ArtistId,
    });

    res.redirect("/concerts");
  } catch (err) {
    res.status(400).send(err.message);
  }
};