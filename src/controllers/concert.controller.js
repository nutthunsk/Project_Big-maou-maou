const { Concert, Artist, Booking } = require("../models");

// ===== helpers =====
const normalizeNumber = (value) => Number(value || 0);
const cleanText = (value) => String(value || "").trim();
const todayDateText = () => new Date().toISOString().slice(0, 10);

const getArtists = () => Artist.findAll({ order: [["ArtistName", "ASC"]] });

const parseArtistIds = (value) => {
  const raw = Array.isArray(value) ? value : [value];

  return [...new Set(raw.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0))];
};

const attachSeatStats = async (concerts) => {
  const concertRows = Array.isArray(concerts) ? concerts : [];
  if (concertRows.length === 0) return [];

  const concertIds = concertRows.map((c) => c.id);

  const bookings = await Booking.findAll({
    where: { ConcertId: concertIds },
    attributes: ["ConcertId", "quantity", "status"],
  });

  const bookedByConcertId = bookings.reduce((acc, b) => {
    if (b.status === "cancelled") return acc;
    const concertId = Number(b.ConcertId);
    acc[concertId] = (acc[concertId] || 0) + Number(b.quantity || 0);
    return acc;
  }, {});

  return concertRows.map((concert) => {
    const c = concert.toJSON();
    const totalSeats = Number(c.totalSeats || 0);
    const bookedSeats = Number(bookedByConcertId[c.id] || 0);
    const remainingSeats = Math.max(totalSeats - bookedSeats, 0);

    return {
      ...c,
      seatStats: {
        totalSeats,
        bookedSeats,
        remainingSeats,
        isSoldOut: remainingSeats <= 0,
      },
    };
  });
};

// ===== controllers =====

// GET /concerts
exports.index = async (_req, res) => {
  try {
    const concerts = await Concert.findAll({
      include: [{ association: "Artists", through: { attributes: [] } }],
      order: [["ConcertDate", "ASC"]],
    });

    const concertsWithSeatStats = await attachSeatStats(concerts);
    res.render("concerts/index", { concerts: concertsWithSeatStats });
  } catch (err) {
    console.error("Concert index error:", err);
    res.redirect("/?error=ไม่สามารถโหลดข้อมูลคอนเสิร์ตได้");
  }
};

// GET /concerts/:id
exports.show = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id, {
      include: [
        { association: "Artists", through: { attributes: [] } },
        { model: Booking },
      ],
    });

    if (!concert) return res.status(404).send("Concert not found");

    const [concertWithSeatStats] = await attachSeatStats([concert]);
    res.render("concerts/show", { concert: concertWithSeatStats });
  } catch (err) {
    console.error("Concert show error:", err);
    res.redirect("/concerts?error=ไม่สามารถโหลดรายละเอียดคอนเสิร์ตได้");
  }
};

// GET /concerts/new
exports.newForm = async (_req, res) => {
  try {
    const artists = await getArtists();
    res.render("concerts/create", { artists });
  } catch (err) {
    console.error("Concert new form error:", err);
    res.redirect("/concerts?error=ไม่สามารถโหลดฟอร์มเพิ่มคอนเสิร์ตได้");
  }
};

// POST /concerts
exports.create = async (req, res) => {
  try {
    const ConcertName = cleanText(req.body.ConcertName);
    const venue = cleanText(req.body.venue);
    const ConcertDate = cleanText(req.body.ConcertDate);
    const totalSeats = normalizeNumber(req.body.totalSeats);
    const price = normalizeNumber(req.body.price);
    const artistIds = parseArtistIds(req.body.ArtistIds);
    const ArtistId = artistIds[0];

    if (
      !ConcertName ||
      !venue ||
      !ConcertDate ||
      !ArtistId ||
      totalSeats <= 0 ||
      price <= 0
    ) {
      return res.redirect("/concerts/new?error=กรุณากรอกข้อมูลให้ถูกต้อง");
    }

    if (ConcertDate < todayDateText()) {
      return res.redirect(
        "/concerts/new?error=วันที่จัดเลยมาแล้ว!!!",
      );
    }

    const duplicatedConcert = await Concert.findOne({ where: { ConcertName } });
    if (duplicatedConcert) {
      return res.redirect("/concerts/new?error=ชื่อคอนเสิร์ตนี้มีอยู่แล้ว");
    }

    const concert = await Concert.create({
      ConcertName,
      venue,
      ConcertDate,
      totalSeats,
      price,
      ArtistId,
    });

    await concert.setArtists(artistIds);

    res.redirect("/concerts?success=เพิ่มคอนเสิร์ตเรียบร้อย");
  } catch (err) {
    console.error("Concert create error:", err);
    res.redirect("/concerts/new?error=ไม่สามารถเพิ่มคอนเสิร์ตได้");
  }
};

// GET /concerts/:id/edit
exports.editForm = async (req, res) => {
  try {
    const [concert, artists] = await Promise.all([
      Concert.findByPk(req.params.id, {
        include: [{ association: "Artists", through: { attributes: [] } }],
      }),
      getArtists(),
    ]);

    if (!concert) return res.status(404).send("Concert not found");

    res.render("concerts/edit", { concert, artists });
  } catch (err) {
    console.error("Concert edit form error:", err);
    res.redirect("/concerts?error=ไม่สามารถโหลดฟอร์มแก้ไขคอนเสิร์ตได้");
  }
};

// PUT /concerts/:id
exports.update = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id);
    if (!concert) return res.status(404).send("Concert not found");

    const ConcertName = cleanText(req.body.ConcertName);
    const venue = cleanText(req.body.venue);
    const ConcertDate = cleanText(req.body.ConcertDate);
    const totalSeats = normalizeNumber(req.body.totalSeats);
    const price = normalizeNumber(req.body.price);
    const artistIds = parseArtistIds(req.body.ArtistIds);
    const ArtistId = artistIds[0];

    if (
      !ConcertName ||
      !venue ||
      !ConcertDate ||
      !ArtistId ||
      totalSeats <= 0 ||
      price <= 0
    ) {
      return res.redirect(
        `/concerts/${concert.id}/edit?error=กรุณากรอกข้อมูลให้ถูกต้อง`,
      );
    }

    if (ConcertDate < todayDateText()) {
      return res.redirect(
        "/concerts/new?error=วันที่จัดเลยมาแล้ว!!!",
      );
    }

    const duplicatedConcert = await Concert.findOne({ where: { ConcertName } });
    if (duplicatedConcert) {
      return res.redirect("/concerts/new?error=ชื่อคอนเสิร์ตนี้มีอยู่แล้ว");
    }

    await concert.update({
      ConcertName,
      venue,
      ConcertDate,
      totalSeats,
      price,
      ArtistId,
    });

    await concert.setArtists(artistIds);

    res.redirect(`/concerts/${concert.id}?success=แก้ไขคอนเสิร์ตเรียบร้อย`);
  } catch (err) {
    console.error("Concert update error:", err);
    res.redirect(
      `/concerts/${req.params.id}/edit?error=ไม่สามารถแก้ไขคอนเสิร์ตได้`,
    );
  }
};

// DELETE /concerts/:id
exports.delete = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id);
    if (!concert) return res.status(404).send("Concert not found");

    await Booking.destroy({ where: { ConcertId: concert.id } });
    await concert.destroy();

    res.redirect("/concerts?success=ลบคอนเสิร์ตเรียบร้อย");
  } catch (err) {
    console.error("Concert delete error:", err);
    res.redirect("/concerts?error=ไม่สามารถลบคอนเสิร์ตได้");
  }
};
