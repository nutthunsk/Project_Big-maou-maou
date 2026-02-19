const { Artist, Concert } = require("../models");

// GET /artists
const cleanText = (value) => String(value || "").trim();
const normalizeArtistName = (value) => cleanText(value).toUpperCase();

exports.index = async (_req, res) => {
  try {
    const artists = await Artist.findAll({ order: [["id", "ASC"]] });
    return res.render("artists/index", { artists });
  } catch (err) {
    console.error("Artist index error:", err);
    return res.redirect("/artists?error=ไม่สามารถโหลดข้อมูลศิลปินได้");
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
    return res.redirect("/artists?error=ไม่สามารถโหลดรายละเอียดศิลปินได้");
  }
};

// POST /artists/create
exports.create = async (req, res) => {
  try {
    const ArtistName = normalizeArtistName(req.body.ArtistName);
    const genre = cleanText(req.body.genre);

    if (!ArtistName || !genre) {
      return res.redirect("/artists/new?error=กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    const duplicatedArtist = await Artist.findOne({ where: { ArtistName } });
    if (duplicatedArtist) {
      return res.redirect("/artists/new?error=ชื่อศิลปินนี้มีอยู่แล้ว");
    }

    await Artist.create({ ArtistName, genre });
    return res.redirect("/artists?success=เพิ่มศิลปินเรียบร้อย");
  } catch (err) {
    console.error("Artist create error:", err);
    return res.redirect("/artists/new?error=ไม่สามารถเพิ่มศิลปินได้");
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
    return res.redirect("/artists?error=ไม่สามารถเปิดหน้าแก้ไขศิลปินได้");
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
        `/artists/${artist.id}/edit?error=กรุณากรอกข้อมูลให้ครบถ้วน`,
      );
    }

    const duplicatedArtist = await Artist.findOne({ where: { ArtistName } });
    if (duplicatedArtist && Number(duplicatedArtist.id) !== Number(artist.id)) {
      return res.redirect(
        `/artists/${artist.id}/edit?error=ชื่อศิลปินนี้มีอยู่แล้ว`,
      );
    }
    
    await artist.update({ ArtistName, genre });
    return res.redirect(
      `/artists/${artist.id}?success=แก้ไขข้อมูลศิลปินเรียบร้อย`,
    );
  } catch (err) {
    console.error("Artist update error:", err);
    return res.redirect(
      `/artists/${req.params.id}/edit?error=ไม่สามารถแก้ไขศิลปินได้`,
    );
  }
};

// POST /artists/delete/:id
exports.delete = async (req, res) => {
  try {
    const artist = await Artist.findByPk(req.params.id);
    if (!artist) return res.status(404).send("Artist not found");

    const concertCount = await Concert.count({
      where: { ArtistId: artist.id },
    });
    if (concertCount > 0) {
      return res.redirect(
        "/artists?error=ไม่สามารถลบศิลปินที่มีคอนเสิร์ตผูกอยู่ได้",
      );
    }

    await artist.destroy();
    return res.redirect("/artists?success=ลบศิลปินเรียบร้อย");
  } catch (err) {
    console.error("Artist delete error:", err);
    return res.redirect("/artists?error=ไม่สามารถลบศิลปินได้");
  }
};
