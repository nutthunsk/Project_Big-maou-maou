const { Concert, Artist, sequelize } = require("../models");

// GET /concerts → หน้าเว็บแสดงคอนเสิร์ต
exports.index = async (req, res) => {
  const concerts = await Concert.findAll({
    include: [{ association: "Artists", through: { attributes: [] } }],
  });
  res.render("concerts/index", { concerts });
};

// GET /concerts/create → หน้า admin เพิ่มคอนเสิร์ต
exports.showCreateForm = async (req, res) => {
  const artists = await Artist.findAll();
  res.render("concerts/create", { artists });
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

    res.render("concerts/book", { concert });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// POST /concerts → (admin) เพิ่มคอนเสิร์ต
exports.create = async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const { ConcertName, venue, ConcertDate, totalSeats, price } = req.body;

    // รองรับทั้งฟอร์แมตเดิม (ArtistId) และหลายศิลปิน (ArtistIds[])
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
        totalSeats,
        price,
        ArtistId: normalizedArtistIds[0], // คงไว้เพื่อ backward compatibility ของ schema เดิม
      },
      transaction: t,
    });
    const artists = await Artist.findAll({
      where: { id: normalizedArtistIds },
      transaction: t,
    });

    await concert.addArtists(artists, { transaction: t });

    await t.commit();
    res.redirect("/concerts");
  } catch (err) {
    await t.rollback();
    res.status(400).send(err.message);
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
    res.redirect("/concerts");
  } catch (err) {
    res.status(500).send(err.message);
  }
};