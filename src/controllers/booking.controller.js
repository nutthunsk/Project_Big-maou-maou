const { Op } = require("sequelize");
const { Booking, Concert, Customer } = require("../models");

const cleanText = (value) => String(value || "").trim();
const normalizeNumber = (value) => Number(value || 0);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{8,15}$/;
const ALLOWED_STATUS = new Set(["pending", "paid", "cancelled"]);
const MAX_BOOKING_QTY = 6;
const todayDateText = () => new Date().toISOString().slice(0, 10);

const getBookedSeatsByIdentityInConcert = async ({
  ConcertId,
  email,
  fullname,
}) => {
  const bookings = await Booking.findAll({
    where: { ConcertId },
    include: [
      {
        model: Customer,
        attributes: ["email", "fullname"],
      },
    ],
    attributes: ["quantity", "status"],
  });

  return bookings.reduce((sum, booking) => {
    if (booking.status === "cancelled") return sum;

    const bookingEmail = cleanText(booking.Customer?.email).toLowerCase();
    const bookingFullname = cleanText(booking.Customer?.fullname).toLowerCase();
    const matchedByEmail =
      bookingEmail && bookingEmail === cleanText(email).toLowerCase();
    const matchedByName =
      bookingFullname && bookingFullname === cleanText(fullname).toLowerCase();

    if (!matchedByEmail && !matchedByName) return sum;
    return sum + Number(booking.quantity || 0);
  }, 0);
};

const getBookedSeats = async (ConcertId, excludeBookingId = null) => {
  const where = { ConcertId };
  if (excludeBookingId) where.id = { [Op.ne]: excludeBookingId };

  const bookings = await Booking.findAll({
    where,
    attributes: ["quantity", "status"],
  });

  return bookings.reduce((sum, booking) => {
    if (booking.status === "cancelled") return sum;
    return sum + Number(booking.quantity || 0);
  }, 0);
};

const getRefs = async () => {
  const concerts = await Concert.findAll({ order: [["ConcertDate", "ASC"]] });
  const customers = await Customer.findAll({ order: [["fullname", "ASC"]] });
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
    const { concerts } = await getRefs();
    const selectedConcertId = normalizeNumber(req.query.concertId);
    const selectedConcert =
      concerts.find(
        (concert) => Number(concert.id) === Number(selectedConcertId),
      ) || null;

    if (
      selectedConcert &&
      String(selectedConcert.ConcertDate) < todayDateText()
    ) {
      return res.redirect(
        "/user/concerts?error=คอนเสิร์ตรายการนี้จัดแสดงไปแล้ว ไม่สามารถจองได้",
      );
    }

    return res.render("bookings/create", {
      concerts,
      selectedConcertId,
      selectedConcert,
      maxBookingQty: MAX_BOOKING_QTY,
      authCustomer: req.authCustomer || null,
    });
  } catch (err) {
    console.error("Booking new form error:", err);
    return res.redirect(
      "/user/concerts?error=ไม่สามารถโหลดฟอร์มเพิ่มการจองได้",
    );
  }
};

exports.create = async (req, res) => {
  try {
    const ConcertId = normalizeNumber(req.body.ConcertId);
    const authCustomer = req.authCustomer || null;
    const fullname = cleanText(req.body.fullname || authCustomer?.fullname);
    const email = cleanText(
      authCustomer?.email || req.body.email,
    ).toLowerCase();
    const phoneNumber = cleanText(
      req.body.phoneNumber || authCustomer?.phoneNumber,
    );
    const quantity = normalizeNumber(req.body.quantity);
    const status = cleanText(req.body.status) || "pending";
    const backUrl = ConcertId
      ? `/bookings/new?concertId=${ConcertId}`
      : "/bookings/new";
    const errorUrl = (message) =>
      `${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`;

    if (!ConcertId || !fullname || !email || !phoneNumber || quantity <= 0) {
      return res.redirect(errorUrl("กรุณากรอกข้อมูลให้ถูกต้อง"));
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.redirect(errorUrl("รูปแบบอีเมลไม่ถูกต้อง"));
    }

    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.redirect(errorUrl("เบอร์โทรต้องเป็นตัวเลข 8-15 หลัก"));
    }

    if (!Number.isInteger(quantity) || quantity > MAX_BOOKING_QTY) {
      return res.redirect(errorUrl(`จองได้ไม่เกิน ${MAX_BOOKING_QTY} ใบต่อรายการ`));
    }

    if (!ALLOWED_STATUS.has(status)) {
      return res.redirect(errorUrl("สถานะการจองไม่ถูกต้อง"));
    }
    
    const concert = await Concert.findByPk(ConcertId);
    if (!concert) {
      return res.redirect(errorUrl("ไม่พบข้อมูลคอนเสิร์ต"));
    }

    if (String(concert.ConcertDate) < todayDateText()) {
      return res.redirect(
        errorUrl("คอนเสิร์ตรายการนี้จัดแสดงไปแล้ว ไม่สามารถจองได้"),
      );
    }

    // 🔥 สร้างหรือค้นหา Customer (เหลือแค่รอบเดียว)
    const [customer] = await Customer.findOrCreate({
      where: { email },
      defaults: { fullname, email, phoneNumber },
    });

    // ถ้าข้อมูลเปลี่ยนให้อัปเดต
    if (
      customer.fullname !== fullname ||
      customer.phoneNumber !== phoneNumber
    ) {
      await customer.update({ fullname, phoneNumber });
    }

    const alreadyReservedByIdentity = await getBookedSeatsByIdentityInConcert({
      ConcertId,
      email,
      fullname,
    });

    if (alreadyReservedByIdentity + quantity > MAX_BOOKING_QTY) {
      return res.redirect(
        errorUrl(
          `1 อีเมล จองได้สูงสุด ${MAX_BOOKING_QTY} ใบ`,
        ),
      );
    }

    const bookedSeats = await getBookedSeats(ConcertId);
    const remainingSeats = Number(concert.totalSeats || 0) - bookedSeats;

    if (quantity > remainingSeats) {
      return res.redirect(
        errorUrl(
          `จำนวนบัตรเกินที่นั่งคงเหลือ (${Math.max(remainingSeats, 0)} ที่นั่ง)`,
        ),
      );
    }

    const totalPrice = Number(concert.price) * quantity;

    await Booking.create({
      ConcertId,
      CustomerId: customer.id,
      quantity,
      status,
      totalPrice,
    });

    return res.redirect("/user?success=จองบัตรเรียบร้อย");
  } catch (err) {
    console.error("Booking create error:", err);
    return res.redirect("/user/concerts?error=ไม่สามารถเพิ่มการจองได้");
  }
};

exports.editForm = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    const { concerts, customers } = await getRefs();

    return res.render("bookings/edit", {
      booking,
      concerts,
      customers,
    });
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

    if (!Number.isInteger(quantity) || quantity > MAX_BOOKING_QTY) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=จองได้ไม่เกิน ${MAX_BOOKING_QTY} ใบต่อรายการ`,
      );
    }

    if (!ALLOWED_STATUS.has(status)) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=สถานะการจองไม่ถูกต้อง`,
      );
    }

    const concert = await Concert.findByPk(ConcertId);
    if (!concert) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=ไม่พบข้อมูลคอนเสิร์ต`,
      );
    }

    const bookedSeats = await getBookedSeats(ConcertId, booking.id);
    const remainingSeats = Number(concert.totalSeats || 0) - bookedSeats;

    if (quantity > remainingSeats) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=จำนวนบัตรเกินที่นั่งคงเหลือ (${Math.max(remainingSeats, 0)} ที่นั่ง)`,
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

exports.markAsPaid = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    await booking.update({ status: "paid" });
    return res.redirect("/bookings?success=อัปเดตสถานะเป็น paid เรียบร้อย");
  } catch (err) {
    console.error("Booking mark as paid error:", err);
    return res.redirect("/bookings?error=ไม่สามารถอัปเดตสถานะการจองได้");
  }
};

exports.markAsPending = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    await booking.update({ status: "pending" });
    return res.redirect("/bookings?success=อัปเดตสถานะเป็น pending เรียบร้อย");
  } catch (err) {
    console.error("Booking mark as pending error:", err);
    return res.redirect("/bookings?error=ไม่สามารถอัปเดตสถานะการจองได้");
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
