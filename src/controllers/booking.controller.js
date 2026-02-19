const { Booking, Concert, Customer } = require("../models");

const cleanText = (value) => String(value || "").trim();
const normalizeNumber = (value) => Number(value || 0);

const getRefs = async () => {
  const [concerts, customers] = await Promise.all([
    Concert.findAll({ order: [["ConcertDate", "ASC"]] }),
    Customer.findAll({ order: [["fullname", "ASC"]] }),
  ]);
  return { concerts, customers };
};

exports.index = async (_req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [Concert, Customer],
      order: [["id", "DESC"]],
    });

    return res.render("bookings/index", { bookings });
  } catch (err) {
    console.error("Booking index error:", err);
    return res.redirect("/?error=ไม่สามารถโหลดรายการจองได้");
  }
};

exports.show = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [Concert, Customer],
    });

    if (!booking) return res.status(404).send("Booking not found");
    return res.render("bookings/show", { booking });
  } catch (err) {
    console.error("Booking show error:", err);
    return res.redirect("/bookings?error=ไม่สามารถโหลดรายละเอียดการจองได้");
  }
};

exports.newForm = async (req, res) => {
  try {
    const { concerts, customers } = await getRefs();
     const selectedConcertId = normalizeNumber(req.query.concertId);

    return res.render("bookings/create", {
      concerts,
      customers,
      selectedConcer
    });
  } catch (err) {
    console.error("Booking new form error:", err);
    return res.redirect("/bookings?error=ไม่สามารถโหลดฟอร์มเพิ่มการจองได้");
  }
};

exports.create = async (req, res) => {
  try {
    const ConcertId = normalizeNumber(req.body.ConcertId);
    const CustomerId = normalizeNumber(req.body.CustomerId);
    const quantity = normalizeNumber(req.body.quantity);
    const status = cleanText(req.body.status) || "pending";

    if (!ConcertId || !CustomerId || quantity <= 0) {
      return res.redirect("/bookings/new?error=กรุณากรอกข้อมูลให้ถูกต้อง");
    }

    const concert = await Concert.findByPk(ConcertId);
    if (!concert) {
      return res.redirect("/bookings/new?error=ไม่พบข้อมูลคอนเสิร์ต");
    }

    const totalPrice = Number(concert.price) * quantity;

    await Booking.create({
      ConcertId,
      CustomerId,
      quantity,
      status,
      totalPrice,
    });

    return res.redirect("/bookings?success=เพิ่มการจองเรียบร้อย");
  } catch (err) {
    console.error("Booking create error:", err);
    return res.redirect("/bookings/new?error=ไม่สามารถเพิ่มการจองได้");
  }
};

exports.editForm = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    const { concerts, customers } = await getRefs();
    return res.render("bookings/edit", { booking, concerts, customers });
  } catch (err) {
    console.error("Booking edit form error:", err);
    return res.redirect("/bookings?error=ไม่สามารถโหลดฟอร์มแก้ไขการจองได้");
  }
};

exports.update = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    const ConcertId = normalizeNumber(req.body.ConcertId);
    const CustomerId = normalizeNumber(req.body.CustomerId);
    const quantity = normalizeNumber(req.body.quantity);
    const status = cleanText(req.body.status) || "pending";

    if (!ConcertId || !CustomerId || quantity <= 0) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=กรุณากรอกข้อมูลให้ถูกต้อง`,
      );
    }

    const concert = await Concert.findByPk(ConcertId);
    if (!concert) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=ไม่พบข้อมูลคอนเสิร์ต`,
      );
    }

    const totalPrice = Number(concert.price) * quantity;

    await booking.update({
      ConcertId,
      CustomerId,
      quantity,
      status,
      totalPrice,
    });

    return res.redirect(`/bookings/${booking.id}?success=แก้ไขการจองเรียบร้อย`);
  } catch (err) {
    console.error("Booking update error:", err);
    return res.redirect(
      `/bookings/${req.params.id}/edit?error=ไม่สามารถแก้ไขการจองได้`,
    );
  }
};

exports.delete = async (req, res) => {
  try {
    await Booking.destroy({ where: { id: req.params.id } });
    return res.redirect("/bookings?success=ลบการจองเรียบร้อย");
  } catch (err) {
    console.error("Booking delete error:", err);
    return res.redirect("/bookings?error=ไม่สามารถลบการจองได้");
  }
};
