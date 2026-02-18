const { Booking, Concert, Customer } = require("../models");

const PHONE_REGEX = /^[0-9]{8,15}$/;

const calculateBookedSeats = async (concertId) => {
  const bookings = await Booking.findAll({
    where: { ConcertId: concertId },
    attributes: ["quantity", "status"],
  });
  return bookings
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);
};

const index = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [Customer, Concert],
      order: [["id", "DESC"]],
    });

    return res.render("bookings/index", { bookings });
  } catch (err) {
    console.error("Booking index error:", err);
    return res.status(500).send("ไม่สามารถโหลดรายการจองได้");
  }
};

const create = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, quantity, concertId } = req.body;

  const normalizedQty = Number(quantity);
    if (!Number.isInteger(normalizedQty) || normalizedQty <= 0) {
      return res.status(400).send("จำนวนบัตรต้องเป็นตัวเลขจำนวนเต็มและมากกว่า 0");
    }

    if (!PHONE_REGEX.test(String(phoneNumber || ""))) {
      return res.status(400).send("เบอร์โทรต้องเป็นตัวเลข 8-15 หลัก");
    }

    const concert = await Concert.findByPk(concertId);
    if (!concert) {
      return res.status(404).send("Concert not found");
    }

  const bookedSeats = await calculateBookedSeats(concert.id);
    const totalSeats = Number(concert.totalSeats || 0);
    const availableSeats = Math.max(totalSeats - bookedSeats, 0);

    if (availableSeats <= 0) {
      return res.status(400).send("บัตรหมด");
    }

    if (normalizedQty > availableSeats) {
      return res
        .status(400)
        .send(`จำนวนที่นั่งคงเหลือไม่พอ (คงเหลือ ${availableSeats} ที่นั่ง)`);
    }

    let customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      customer = await Customer.create({ fullname, email, phoneNumber });
    } else {
      await customer.update({
        fullname: fullname || customer.fullname,
        phoneNumber,
      });
    }

    const totalPrice = Number(concert.price) * normalizedQty;

    await Booking.create({
      quantity: normalizedQty,
      totalPrice,
      status: "pending",
      CustomerId: customer.id,
      ConcertId: concert.id,
    });

    return res.redirect("/bookings");
  } catch (err) {
    console.error("Booking create error:", err);
    return res.status(500).send("เกิดข้อผิดพลาดในการจองบัตร");
  }
};

const pay = async (req, res) => {
  try {
    const [updatedRows] = await Booking.update(
      { status: "paid" },
      { where: { id: req.params.id, status: "pending" } }
    );

    if (!updatedRows) {
      return res.status(404).send("ไม่พบรายการที่รอชำระ");
    }

    return res.redirect("/bookings");
  } catch (err) {
    console.error("Booking pay error:", err);
    return res.status(500).send("ไม่สามารถอัปเดตสถานะการชำระเงินได้");
  }
};

module.exports = {
  index,
  create,
  pay,
  calculateBookedSeats,
};