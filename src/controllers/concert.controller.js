//ดึง model
const { Concert, Artist, Booking } = require("../models");
// ใช้จัดการไฟล์แบบ async
const fs = require("fs/promises");
// ใช้จัดการ path ไฟล์ให้ข้าม OS ได้
const path = require("path");

// helpers
// แปลงตัวเลข
const normalizeNumber = (value) => Number(value || 0);
const cleanText = (value) => String(value || "").trim();
// วันที่
const todayDateText = () => new Date().toISOString().slice(0, 10);
// รูปโปสเตอร์เริ่มต้น
const DEFAULT_CONCERT_IMAGE = "/images/Poster.png";
// ดึงรายชื่อศิลปินทั้งหมด เรียงตามชื่อ
const getArtists = () => Artist.findAll({ order: [["ArtistName", "ASC"]] });

// แปลง ArtistIds จาก form เป็น array ของตัวเลขที่ไม่ซ้ำและมากกว่า 0
const parseArtistIds = (value) => {
  const raw = Array.isArray(value) ? value : [value];

  return [
    ...new Set(
      raw.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0),
    ),
  ];
};

// อ่านรูปทั้งหมดจาก public/images
const getAvailableImagePaths = async () => {
  const imagesDir = path.join(__dirname, "../../public/images");

  try {
    const files = await fs.readdir(imagesDir, { withFileTypes: true });
    const imagePaths = files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => /\.(png|jpe?g|gif|webp)$/i.test(fileName))
      .sort((a, b) => a.localeCompare(b, "en"))
      .map((fileName) => `/images/${fileName}`);

    if (!imagePaths.length) return [DEFAULT_CONCERT_IMAGE];
    return imagePaths;
  } catch (error) {
    console.error("Read concert images error:", error);
    return [DEFAULT_CONCERT_IMAGE];
  }
};

// แปลงเวลา ตรวจสอบความถูกต้อง
const normalizeConcertTime = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";

  const [hourText = "", minuteText = ""] = raw.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
};

// คำนวณจำนวนที่นั่ง (ทั้งหมด / ถูกจอง / คงเหลือ)
const attachSeatStats = async (concerts) => {
  const concertRows = Array.isArray(concerts) ? concerts : [];
  if (concertRows.length === 0) return [];

  const concertIds = concertRows.map((c) => c.id);

  // ดึงข้อมูลการจองของ concert เหล่านี้
  const bookings = await Booking.findAll({
    where: { ConcertId: concertIds },
    attributes: ["ConcertId", "quantity", "status"],
  });

  // รวมจำนวนที่นั่งที่ถูกจอง (ไม่รวม cancelled
  const bookedByConcertId = bookings.reduce((acc, b) => {
    if (b.status === "cancelled") return acc;
    const concertId = Number(b.ConcertId);
    acc[concertId] = (acc[concertId] || 0) + Number(b.quantity || 0);
    return acc;
  }, {});

  // แนบ seatStats เข้าไปใน concert แต่ละตัว
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

// controllers

// GET /concerts หน้าแสดงคอนเสิร์ตทั้งหมด
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
    res.redirect("/?error=The concert information could not be loaded");
  }
};

// GET /concerts/:id/book ฟอร์มจองบัตร
exports.bookForm = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id, {
      include: [{ association: "Artists", through: { attributes: [] } }],
    });

    if (!concert) return res.status(404).send("Concert not found");

    const [concertWithSeatStats] = await attachSeatStats([concert]);
    return res.render("concerts/book", { concert: concertWithSeatStats });
  } catch (err) {
    console.error("Concert booking page error:", err);
    return res.redirect(
      "/concerts?error=The ticket booking page could not be loaded",
    );
  }
};

// GET /concerts/:id ดูรายละเอียดคอนเสิร์ต
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
    res.redirect("/concerts?error=Unable to load concert details");
  }
};

// GET /concerts/new ฟอร์มเพิ่มคอนเสิร์ต
exports.newForm = async (_req, res) => {
  try {
    const [artists, imageOptions] = await Promise.all([
      getArtists(),
      getAvailableImagePaths(),
    ]);

    res.render("concerts/create", { artists, imageOptions });
  } catch (err) {
    console.error("Concert new form error:", err);
    res.redirect(
      "/concerts?error=The form for adding a concert could not be loaded",
    );
  }
};

// POST /concerts สร้างคอนเสิร์ตใหม่
exports.create = async (req, res) => {
  try {
    // ดึงและ normalize ข้อมูลจาก form
    const ConcertName = cleanText(req.body.ConcertName);
    const venue = cleanText(req.body.venue);
    const ConcertDate = cleanText(req.body.ConcertDate);
    const ConcertTime = normalizeConcertTime(req.body.ConcertTime);
    const totalSeats = normalizeNumber(req.body.totalSeats);
    const price = normalizeNumber(req.body.price);
    const artistIds = parseArtistIds(req.body.ArtistIds);
    const ArtistId = artistIds[0];
    // ตรวจสอบรูปที่เลือก
    const imageOptions = await getAvailableImagePaths();
    const selectedImage = cleanText(req.body.imagePath);
    const imagePath = imageOptions.includes(selectedImage)
      ? selectedImage
      : DEFAULT_CONCERT_IMAGE;

    // validation ข้อมูล
    if (
      !ConcertName ||
      !venue ||
      !ConcertDate ||
      !ConcertTime ||
      !ArtistId ||
      totalSeats <= 0 ||
      price <= 0
    ) {
      return res.redirect(
        "/concerts/new?error=Please fill in the information correctly",
      );
    }

    // ห้ามเลือกวันที่ย้อนหลัง
    if (ConcertDate < todayDateText()) {
      return res.redirect("/concerts/new?error=The date has passed!!!");
    }

    // ตรวจสอบชื่อซ้ำ
    const duplicatedConcert = await Concert.findOne({ where: { ConcertName } });
    if (duplicatedConcert) {
      return res.redirect(
        "/concerts/new?error=The name of this concert already exists",
      );
    }

    // สร้าง concert
    const concert = await Concert.create({
      ConcertName,
      venue,
      ConcertDate,
      ConcertTime,
      totalSeats,
      price,
      ArtistId,
      imagePath,
    });

    // ผูก artist (many-to-many)
    await concert.setArtists(artistIds);

    res.redirect("/concerts?success=The concert has been added");
  } catch (err) {
    console.error("Concert create error:", err);
    res.redirect("/concerts/new?error=Unable to add a concert");
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
    const imageOptions = await getAvailableImagePaths();

    if (!concert) return res.status(404).send("Concert not found");

    res.render("concerts/edit", { concert, artists, imageOptions });
  } catch (err) {
    console.error("Concert edit form error:", err);
    res.redirect(
      "/concerts?error=The concert editing form could not be loaded",
    );
  }
};

// PUT /concerts/:id แก้ไขคอนเสิร์ต
exports.update = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id);
    if (!concert) return res.status(404).send("Concert not found");

    // normalize ข้อมูลใหม่
    const ConcertName = cleanText(req.body.ConcertName);
    const venue = cleanText(req.body.venue);
    const ConcertDate = cleanText(req.body.ConcertDate);
    const ConcertTime = normalizeConcertTime(req.body.ConcertTime);
    const totalSeats = normalizeNumber(req.body.totalSeats);
    const price = normalizeNumber(req.body.price);
    const artistIds = parseArtistIds(req.body.ArtistIds);
    const ArtistId = artistIds[0];
    const imageOptions = await getAvailableImagePaths();
    const selectedImage = cleanText(req.body.imagePath);
    const imagePath = imageOptions.includes(selectedImage)
      ? selectedImage
      : DEFAULT_CONCERT_IMAGE;

    if (
      !ConcertName ||
      !venue ||
      !ConcertDate ||
      !ConcertTime ||
      !ArtistId ||
      totalSeats <= 0 ||
      price <= 0
    ) {
      return res.redirect(
        `/concerts/${concert.id}/edit?error=Please fill in the information correctly`,
      );
    }

    const previousConcertDate = String(concert.ConcertDate || "");
    if (ConcertDate < todayDateText() && ConcertDate !== previousConcertDate) {
      return res.redirect("/concerts/new?error=The date has passed!!");
    }

    // ตรวจสอบชื่อซ้ำ (เฉพาะตอนเปลี่ยนชื่อ)
    const normalizedCurrentName = cleanText(concert.ConcertName).toLowerCase();
    const normalizedIncomingName = cleanText(ConcertName).toLowerCase();

    if (normalizedIncomingName !== normalizedCurrentName) {
      const duplicatedConcert = await Concert.findOne({
        where: { ConcertName },
      });
      if (duplicatedConcert) {
        return res.redirect(
          `/concerts/${concert.id}/edit?error=The name of this concert already exists`,
        );
      }
    }

    // update ข้อมูล
    await concert.update({
      ConcertName,
      venue,
      ConcertDate,
      ConcertTime,
      totalSeats,
      price,
      ArtistId,
      imagePath,
    });

    await concert.setArtists(artistIds);

    res.redirect(
      `/concerts/${concert.id}?success=The concert arrangements have already been finalized`,
    );
  } catch (err) {
    console.error("Concert update error:", err);
    res.redirect(
      `/concerts/${req.params.id}/edit?error=Unable to edit concert`,
    );
  }
};

// DELETE /concerts/:id ลบคอนเสิร์ต
exports.delete = async (req, res) => {
  try {
    const concert = await Concert.findByPk(req.params.id);
    if (!concert) return res.status(404).send("Concert not found");

    // ลบ booking ที่เกี่ยวข้องก่อน
    await Booking.destroy({ where: { ConcertId: concert.id } });
    await concert.destroy();

    res.redirect("/concerts?success=The concert has been deleted");
  } catch (err) {
    console.error("Concert delete error:", err);
    res.redirect("/concerts?error=Unable to delete concert");
  }
};
