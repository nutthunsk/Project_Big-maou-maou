const { Concert, Artist, Booking, sequelize } = require("../models");

const attachSeatStats = async (concerts) => {
  const concertIds = concerts.map((concert) => concert.id);
  if (concertIds.length === 0) {
    return [];
  }

  const bookings = await Booking.findAll({
    where: { ConcertId: concertIds },
    attributes: ["ConcertId", "quantity", "status"],
  });

  const bookedByConcert = bookings.reduce((acc, booking) => {
    if (booking.status === "cancelled") {
      return acc;
    }

    const concertId = Number(booking.ConcertId);
    acc[concertId] = (acc[concertId] || 0) + Number(booking.quantity || 0);
    return acc;
  }, {});

  return concerts.map((concert) => {
    const totalSeats = Number(concert.totalSeats || 0);
    const bookedSeats = Number(bookedByConcert[concert.id] || 0);
    const remainingSeats = Math.max(totalSeats - bookedSeats, 0);

    return {
      ...concert.toJSON(),
      seatStats: {
        totalSeats,
        bookedSeats,
        remainingSeats,
        isSoldOut: remainingSeats <= 0,
      },
    };
  });
};

// GET /concerts → หน้าเว็บแสดงคอนเสิร์ต
exports.index = async (req, res) => {
  try {
    const concerts = await Concert.findAll({
      include: [{ association: "Artists", through: { attributes: [] } }],
      order: [["ConcertDate", "ASC"]],
    });

    const concertsWithSeatStats = await attachSeatStats(concerts);

    return res.render("concerts/index", { concerts: concertsWithSeatStats });
  } catch (err) {
    console.error("Concert index error:", err);
    return res.status(500).send("ไม่สามารถโหลดข้อมูลคอนเสิร์ตได้");
  }
};

// GET /concerts/create → หน้า admin เพิ่มคอนเสิร์ต
exports.showCreateForm = async (req, res) => {
  try {
    const artists = await Artist.findAll({ order: [["ArtistName", "ASC"]] });
    return res.render("concerts/create", { artists });
  } catch (err) {
    console.error("Concert create form error:", err);
    return res.status(500).send("ไม่สามารถโหลดหน้าสร้างคอนเสิร์ตได้");
  }
};

// GET /concerts/:id/book → หน้า form จองบัตร
exports.showBookingForm = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id, {
      include: [{ association: "Artists", through: { attributes: [] } }],
    });

    if (!concert) {
      return res.status(404).send("Concert not found");
    }

    const [concertWithStats] = await attachSeatStats([concert]);
    return res.render("concerts/book", { concert: concertWithStats });
  } catch (err) {
    console.error("Concert booking form error:", err);
    return res.status(500).send("ไม่สามารถโหลดหน้าจองบัตรได้");
  }
};

// POST /concerts → (admin) เพิ่มคอนเสิร์ต
exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ConcertName, venue, ConcertDate, totalSeats, price } = req.body;

    const normalizedSeats = Number(totalSeats);
    const normalizedPrice = Number(price);

    if (!Number.isInteger(normalizedSeats) || normalizedSeats <= 0) {
      await t.rollback();
      return res.status(400).send("จำนวนที่นั่งต้องเป็นตัวเลขจำนวนเต็มและมากกว่า 0");
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      await t.rollback();
      return res.status(400).send("ราคาต้องเป็นตัวเลขและมากกว่า 0");
    }

    const artistIds = [];

    if (req.body.ArtistId) {
      artistIds.push(req.body.ArtistId);
    }

    if (Array.isArray(req.body.ArtistIds)) {
      artistIds.push(...req.body.ArtistIds);
    } else if (req.body["ArtistIds[]"]) {
      artistIds.push(req.body["ArtistIds[]"]);
    }

    const normalizedArtistIds = [...new Set(artistIds.map((id) => Number(id)).filter(Boolean))];

    if (normalizedArtistIds.length === 0) {
      await t.rollback();
      return res.status(400).send("กรุณาเลือกศิลปินอย่างน้อย 1 คน");
    }

    // ถ้าคอนเสิร์ตซ้ำ (ชื่อ+สถานที่+วัน) ให้รวมเป็นคอนเดิม แล้วเพิ่มศิลปินเข้าไป
    const [concert] = await Concert.findOrCreate({
      where: { ConcertName, venue, ConcertDate },
      defaults: {
        ConcertName,
        venue,
        ConcertDate,
        totalSeats: normalizedSeats,
        price: normalizedPrice,
        ArtistId: normalizedArtistIds[0],
      },
      transaction: t,
    });

    await concert.update(
      {
        totalSeats: normalizedSeats,
        price: normalizedPrice,
      },
      { transaction: t }
    );

    const artists = await Artist.findAll({
      where: { id: normalizedArtistIds },
      transaction: t,
    });

    await concert.addArtists(artists, { transaction: t });

    await t.commit();
    return res.redirect("/concerts");
  } catch (err) {
    await t.rollback();
    console.error("Concert create error:", err);
    return res.status(400).send(err.message);
  }
};

// POST /concerts/:id/delete
exports.delete = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id);

    if (!concert) {
      return res.status(404).send("Concert not found");
    }

    await concert.destroy();
    return res.redirect("/concerts");
  } catch (err) {
    console.error("Concert delete error:", err);
    return res.status(500).send(err.message);
  }
};