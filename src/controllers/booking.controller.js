// ===============================
// import operator และ model
// ===============================

// Op ใช้สำหรับ operator ของ Sequelize (เช่น !=, >, <)
const { Op } = require("sequelize");

// Booking  = ตารางการจอง
// Concert  = ตารางคอนเสิร์ต
// Customer = ตารางลูกค้า
const { Booking, Concert, Customer } = require("../models");

// ===============================
// helper functions & constants
// ===============================

// แปลงค่าเป็น string และตัดช่องว่างหน้า-หลัง
const cleanText = (value) => String(value || "").trim();

// แปลงค่าเป็น number (ถ้าไม่มีให้เป็น 0)
const normalizeNumber = (value) => Number(value || 0);

// regex ตรวจสอบรูปแบบอีเมล
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// regex ตรวจสอบเบอร์โทร (ตัวเลข 8–15 หลัก)
const PHONE_REGEX = /^[0-9]{8,15}$/;

// สถานะการจองที่อนุญาต
const ALLOWED_STATUS = new Set(["pending", "paid", "cancelled"]);

// จำนวนตั๋วสูงสุดต่อ 1 การจอง
const MAX_BOOKING_QTY = 6;

// คืนค่าวันปัจจุบันในรูปแบบ YYYY-MM-DD
const todayDateText = () => new Date().toISOString().slice(0, 10);

// ===============================
// คำนวณจำนวนที่นั่งที่จองแล้ว
// (อ้างอิงจาก email หรือ fullname)
// ===============================

const getBookedSeatsByIdentityInConcert = async ({
  ConcertId,
  email,
  fullname,
}) => {
  // ดึง booking ทั้งหมดของคอนเสิร์ตนั้น
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

  // รวมจำนวนที่นั่งที่จองแล้ว
  return bookings.reduce((sum, booking) => {
    // ไม่นับ booking ที่ถูกยกเลิก
    if (booking.status === "cancelled") return sum;

    // เตรียมข้อมูลไว้เปรียบเทียบ
    const bookingEmail = cleanText(booking.Customer?.email).toLowerCase();
    const bookingFullname = cleanText(booking.Customer?.fullname).toLowerCase();

    // ตรวจสอบว่าตรงกันด้วย email หรือชื่อ
    const matchedByEmail =
      bookingEmail && bookingEmail === cleanText(email).toLowerCase();
    const matchedByName =
      bookingFullname && bookingFullname === cleanText(fullname).toLowerCase();

    // ถ้าไม่ตรงทั้งคู่ ไม่ต้องนับ
    if (!matchedByEmail && !matchedByName) return sum;

    // รวมจำนวนตั๋ว
    return sum + Number(booking.quantity || 0);
  }, 0);
};

// ===============================
// คำนวณจำนวนที่นั่งที่ถูกจองแล้วทั้งหมด
// (ใช้ตอนเช็คที่นั่งคงเหลือ)
// ===============================

const getBookedSeats = async (ConcertId, excludeBookingId = null) => {
  const where = { ConcertId };

  // กรณีแก้ไข booking ให้ไม่นับตัวเอง
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

// ===============================
// ดึงข้อมูลอ้างอิง (concert / customer)
// ===============================

const getRefs = async () => {
  const concerts = await Concert.findAll({ order: [["ConcertDate", "ASC"]] });
  const customers = await Customer.findAll({ order: [["fullname", "ASC"]] });
  return { concerts, customers };
};

// ===============================
// GET /bookings
// แสดงรายการการจองทั้งหมด
// ===============================

exports.index = async (_req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [Concert, Customer],
      order: [["id", "DESC"]],
    });

    return res.render("bookings/index", { bookings });
  } catch (err) {
    console.error("Booking index error:", err);
    return res.redirect("/?error=Unable to load booking details");
  }
};

// ===============================
// GET /bookings/:id
// แสดงรายละเอียดการจอง
// ===============================

exports.show = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [Concert, Customer],
    });

    if (!booking) return res.status(404).send("Booking not found");
    return res.render("bookings/show", { booking });
  } catch (err) {
    console.error("Booking show error:", err);
    return res.redirect("/bookings?error=The booking details could not be loaded");
  }
};

// ===============================
// GET /bookings/new
// แสดงฟอร์มจองตั๋ว
// ===============================

exports.newForm = async (req, res) => {
  try {
    const { concerts } = await getRefs();

    // concert ที่ถูกเลือก (ถ้ามาจากหน้า concert)
    const selectedConcertId = normalizeNumber(req.query.concertId);
    const selectedConcert =
      concerts.find(
        (concert) => Number(concert.id) === Number(selectedConcertId),
      ) || null;

    // ถ้าคอนเสิร์ตผ่านไปแล้ว ห้ามจอง
    if (
      selectedConcert &&
      String(selectedConcert.ConcertDate) < todayDateText()
    ) {
      return res.redirect(
        "/user/concerts?error=This concert has already taken place and is no longer available for booking",
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
      "/user/concerts?error=The form for adding a booking cannot be loaded",
    );
  }
};

// ===============================
// POST /bookings/create
// สร้างการจองใหม่
// ===============================

exports.create = async (req, res) => {
  try {
    // ดึงข้อมูลจาก form / user ที่ login
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

    // URL กลับไปหน้าเดิมพร้อม error
    const backUrl = ConcertId
      ? `/bookings/new?concertId=${ConcertId}`
      : "/bookings/new";

    const errorUrl = (message) =>
      `${backUrl}${backUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`;

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!ConcertId || !fullname || !email || !phoneNumber || quantity <= 0) {
      return res.redirect(errorUrl("Please fill in the information correctly"));
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.redirect(errorUrl("Invalid email format"));
    }

    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.redirect(errorUrl("The phone number must be 8-15 digits long"));
    }

    if (!Number.isInteger(quantity) || quantity > MAX_BOOKING_QTY) {
      return res.redirect(
        errorUrl(`You can reserve no more than ${MAX_BOOKING_QTY} invoice per item`),
      );
    }

    if (!ALLOWED_STATUS.has(status)) {
      return res.redirect(errorUrl("Invalid booking status"));
    }

    // ตรวจสอบ concert
    const concert = await Concert.findByPk(ConcertId);
    if (!concert) {
      return res.redirect(errorUrl("No concert information found"));
    }

    if (String(concert.ConcertDate) < todayDateText()) {
      return res.redirect(
        errorUrl("This concert has already taken place and is no longer available for booking"),
      );
    }

    // ค้นหาหรือสร้าง customer (ใช้ email เป็นหลัก)
    const [customer] = await Customer.findOrCreate({
      where: { email },
      defaults: { fullname, email, phoneNumber },
    });

    // ถ้าข้อมูลลูกค้าเปลี่ยน ให้อัปเดต
    if (
      customer.fullname !== fullname ||
      customer.phoneNumber !== phoneNumber
    ) {
      await customer.update({ fullname, phoneNumber });
    }

    // ตรวจสอบการจองซ้ำต่อคน
    const alreadyReservedByIdentity = await getBookedSeatsByIdentityInConcert({
      ConcertId,
      email,
      fullname,
    });

    if (alreadyReservedByIdentity + quantity > MAX_BOOKING_QTY) {
      return res.redirect(
        errorUrl(`One email address can be used for bookings up to a maximum of ${MAX_BOOKING_QTY} blade`),
      );
    }

    // ตรวจสอบจำนวนที่นั่งคงเหลือ
    const bookedSeats = await getBookedSeats(ConcertId);
    const remainingSeats = Number(concert.totalSeats || 0) - bookedSeats;

    if (quantity > remainingSeats) {
      return res.redirect(
        errorUrl(
          `The number of tickets exceeds the number of seats available (${Math.max(remainingSeats, 0)} seats)`),
      );
    }

    // คำนวณราคาทั้งหมด
    const totalPrice = Number(concert.price) * quantity;

    // สร้าง booking
    await Booking.create({
      ConcertId,
      CustomerId: customer.id,
      quantity,
      status,
      totalPrice,
    });

    return res.redirect("/user?success=Already reserved tickets");
  } catch (err) {
    console.error("Booking create error:", err);
    return res.redirect("/user/concerts?error=Unable to add a booking");
  }
};

// ===============================
// GET /bookings/edit/:id
// ===============================

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
    return res.redirect("/bookings?error=The booking modification form cannot be loaded");
  }
};

// ===============================
// POST /bookings/edit/:id
// ===============================

exports.update = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    const ConcertId = normalizeNumber(req.body.ConcertId);
    const CustomerId = normalizeNumber(req.body.CustomerId);
    const quantity = normalizeNumber(req.body.quantity);
    const status = cleanText(req.body.status) || "pending";

    // ตรวจสอบข้อมูล
    if (!ConcertId || !CustomerId || quantity <= 0) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=Please fill in the information correctly`,
      );
    }

    if (!Number.isInteger(quantity) || quantity > MAX_BOOKING_QTY) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=You can reserve no more than ${MAX_BOOKING_QTY} invoice per item`,
      );
    }

    if (!ALLOWED_STATUS.has(status)) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=Invalid booking status`,
      );
    }

    // ตรวจสอบจำนวนที่นั่ง
    const concert = await Concert.findByPk(ConcertId);
    if (!concert) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=No concert information found`,
      );
    }

    const bookedSeats = await getBookedSeats(ConcertId, booking.id);
    const remainingSeats = Number(concert.totalSeats || 0) - bookedSeats;

    if (quantity > remainingSeats) {
      return res.redirect(
        `/bookings/${booking.id}/edit?error=The number of tickets exceeds the number of seats available (${Math.max(remainingSeats, 0)} seats)`,
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

    return res.redirect(`/bookings/${booking.id}?success=The reservation has been edited`);
  } catch (err) {
    console.error("Booking update error:", err);
    return res.redirect(
      `/bookings/${req.params.id}/edit?error=Unable to edit reservation`,
    );
  }
};

// ===============================
// เปลี่ยนสถานะเป็น paid
// ===============================

exports.markAsPaid = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    await booking.update({ status: "paid" });
    return res.redirect("/bookings?success=The status has been updated to paid");
  } catch (err) {
    console.error("Booking mark as paid error:", err);
    return res.redirect("/bookings?error=The booking status cannot be updated");
  }
};

// ===============================
// เปลี่ยนสถานะเป็น pending
// ===============================

exports.markAsPending = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).send("Booking not found");

    await booking.update({ status: "pending" });
    return res.redirect("/bookings?success=The status has been updated to pending");
  } catch (err) {
    console.error("Booking mark as pending error:", err);
    return res.redirect("/bookings?error=The booking status cannot be updated");
  }
};

// ===============================
// ลบการจอง
// ===============================

exports.delete = async (req, res) => {
  try {
    await Booking.destroy({ where: { id: req.params.id } });
    return res.redirect("/bookings?success=The reservation was successfully deleted");
  } catch (err) {
    console.error("Booking delete error:", err);
    return res.redirect("/bookings?error=Unable to delete reservation");
  }
};