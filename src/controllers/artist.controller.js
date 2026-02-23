//รับค่าของ model
const { Artist, Concert, Booking } = require("../models");

// ใช้แปลงชื่อคิลปินให้เป็นพิมพ์ใหญ่ และมีการตัดช่องว่าง
const cleanText = (value) => String(value || "").trim();
const normalizeArtistName = (value) => cleanText(value).toUpperCase();

// GET /artists
// แสดงรายชื่อศิลปินทั้งหมด
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

// GET /artists/:id
// แสดงรายละเอียดศิลปินรายคน
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
// เพิ่มศิลปินใหม่
exports.create = async (req, res) => {
  try {
    // รับข้อมูลจาก form และจัดรูปแบบ
    const ArtistName = normalizeArtistName(req.body.ArtistName);
    const genre = cleanText(req.body.genre);

    // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!ArtistName || !genre) {
      return res.redirect("/artists/new?error=Please fill out the information completely");
    }

    // ตรวจสอบว่าชื่อศิลปินซ้ำหรือไม่
    const duplicatedArtist = await Artist.findOne({ where: { ArtistName } });
    if (duplicatedArtist) {
      return res.redirect("/artists/new?error=This artist's name already exists");
    }

    // บันทึกข้อมูลศิลปินใหม่ลง database
    await Artist.create({ ArtistName, genre });

    // redirect กลับหน้า list พร้อมข้อความสำเร็จ
    return res.redirect("/artists?success=Artist added successfully");
  } catch (err) {
    console.error("Artist create error:", err);
    return res.redirect("/artists/new?error=Unable to add artists");
  }
};

// GET /artists/new
// แสดงฟอร์มเพิ่มศิลปิน
exports.newForm = (_req, res) => res.render("artists/create");

// GET /artists/edit/:id
// แสดงฟอร์มแก้ไขศิลปิน
exports.editForm = async (req, res) => {
  try {
    // ค้นหาศิลปินจาก id
    const artist = await Artist.findByPk(req.params.id);
    // ถ้าไม่พบศิลปิน
    if (!artist) return res.status(404).send("Artist not found");
    // render หน้าแก้ไข
    return res.render("artists/edit", { artist });
  } catch (err) {
    console.error("Artist edit form error:", err);
    return res.redirect("/artists?error=The artist editing page cannot be opened");
  }
};;

// POST /artists/edit/:id
// แก้ไขข้อมูลศิลปิน
exports.update = async (req, res) => {
  try {
    // ค้นหาศิลปินเดิม
    const artist = await Artist.findByPk(req.params.id);
    if (!artist) return res.status(404).send("Artist not found");

    // รับค่าจาก form และจัดรูปแบบ
    const ArtistName = normalizeArtistName(req.body.ArtistName);
    const genre = cleanText(req.body.genre);

    // ตรวจสอบข้อมูล
    if (!ArtistName || !genre) {
      return res.redirect(
        `/artists/${artist.id}/edit?error=Please fill out the information completely`,
      );
    }

    // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวเอง)
    const duplicatedArtist = await Artist.findOne({ where: { ArtistName } });
    if (duplicatedArtist && Number(duplicatedArtist.id) !== Number(artist.id)) {
      return res.redirect(
        `/artists/${artist.id}/edit?error=This artist's name already exists`,
      );
    }

    // อัปเดตข้อมูลศิลปิน
    await artist.update({ ArtistName, genre });
     // redirect ไปหน้ารายละเอียด
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
// ลบศิลปิน
exports.delete = async (req, res) => {
  try {
    // ค้นหาศิลปินพร้อมคอนเสิร์ตที่เกี่ยวข้อง
    const artist = await Artist.findByPk(req.params.id, {
      include: [{ association: "Concerts", through: { attributes: [] } }],
    });
    if (!artist) return res.status(404).send("Artist not found");
    // ค้นหาคอนเสิร์ตที่ศิลปินคนนี้เป็นเจ้าของหลัก
    const primaryConcerts = await Concert.findAll({
      where: { ArtistId: artist.id },
      include: [{ association: "Artists", through: { attributes: [] } }],
    });
    // วนลูปจัดการแต่ละคอนเสิร์ต
    for (const concert of primaryConcerts) {
      // หา artist คนอื่นที่สามารถแทนได้
      const fallbackArtist = (concert.Artists || []).find(
        (a) => Number(a.id) !== Number(artist.id),
      );
      // ถ้าไม่มีศิลปินอื่น → ลบคอนเสิร์ตและการจอง
      if (!fallbackArtist) {
        await concert.setArtists([]);
        await Booking.destroy({ where: { ConcertId: concert.id } });
        await concert.destroy();
        continue;
      }
      // ถ้ามีศิลปินอื่น → เปลี่ยนเจ้าของคอนเสิร์ต
      await concert.update({ ArtistId: fallbackArtist.id });
    }
    // ลบความสัมพันธ์ artist ↔ concert
    await artist.setConcerts([]);
    // ลบศิลปิน
    await artist.destroy();
    return res.redirect("/artists?success=Artist successfully deleted");
  } catch (err) {
    console.error("Artist delete error:", err);
    return res.redirect("/artists?error=Unable to delete artist");
  }
};