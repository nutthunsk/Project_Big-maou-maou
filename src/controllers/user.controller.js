const { Artist, Concert, Booking, Customer } = require("../models");
const {
  getAuthCustomer,
  setAuthCookie,
  clearAuthCookie,
} = require("../utils/user-auth");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{8,15}$/;

const attachSeatStats = async (concerts) => {
  const concertRows = Array.isArray(concerts) ? concerts : [];
  if (!concertRows.length) return [];

  const concertIds = concertRows.map((concert) => concert.id);
  const bookings = await Booking.findAll({
    where: { ConcertId: concertIds },
    attributes: ["ConcertId", "quantity", "status"],
  });

  const bookedByConcertId = bookings.reduce((acc, booking) => {
    if (booking.status === "cancelled") return acc;
    const concertId = Number(booking.ConcertId);
    acc[concertId] = (acc[concertId] || 0) + Number(booking.quantity || 0);
    return acc;
  }, {});

  return concertRows.map((concert) => {
    const c = concert.toJSON();
    const totalSeats = Number(c.totalSeats || 0);
    const bookedSeats = Number(bookedByConcertId[c.id] || 0);

    return {
      ...c,
      seatStats: {
        totalSeats,
        bookedSeats,
        remainingSeats: Math.max(totalSeats - bookedSeats, 0),
      },
    };
  });
};

exports.home = async (_req, res) => {
  try {
    const [latestArtists, latestConcerts] = await Promise.all([
      Artist.findAll({
        include: [{ association: "Concerts", through: { attributes: [] } }],
        order: [["id", "DESC"]],
        limit: 6,
      }),
      Concert.findAll({
        include: [{ association: "Artists", through: { attributes: [] } }],
        order: [["id", "DESC"]],
        limit: 6,
      }),
    ]);

    res.render("user/home", { latestArtists, latestConcerts });
  } catch (err) {
    console.error("User home error:", err);
    res.render("user/home", { latestArtists: [], latestConcerts: [] });
  }
};

exports.loginForm = async (req, res) => {
  const authCustomer = await getAuthCustomer(req);
  if (authCustomer) {
    const redirectTo = String(req.query.redirect || "/user/concerts");
    return res.redirect(redirectTo);
  }

  return res.render("user/login", {
    redirectTo: String(req.query.redirect || "/user/concerts"),
  });
};

exports.login = async (req, res) => {
  try {
    const fullname = String(req.body.fullname || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phoneNumber = String(req.body.phoneNumber || "").trim();
    const redirectTo = String(req.body.redirectTo || "/user/concerts");

    if (!fullname || !email || !phoneNumber) {
      return res.redirect(
        `/user/login?error=${encodeURIComponent("กรุณากรอกข้อมูลให้ครบ")}&redirect=${encodeURIComponent(redirectTo)}`,
      );
    }

    const [customer] = await Customer.findOrCreate({
      where: { email },
      defaults: { fullname, email, phoneNumber },
    });

    if (
      customer.fullname !== fullname ||
      customer.phoneNumber !== phoneNumber
    ) {
      await customer.update({ fullname, phoneNumber });
    }

    setAuthCookie(res, customer.id);
    return res.redirect(redirectTo || "/user/concerts");
  } catch (err) {
    console.error("User login error:", err);
    return res.redirect("/user/login?error=ไม่สามารถเข้าสู่ระบบได้");
  }
};

exports.logout = (_req, res) => {
  clearAuthCookie(res);
  return res.redirect("/user?success=ออกจากระบบเรียบร้อย");
};

exports.artists = async (_req, res) => {
  try {
    const artists = await Artist.findAll({
      include: [{ association: "Concerts", through: { attributes: [] } }],
      order: [["id", "ASC"]],
    });

    res.render("user/artists", { artists });
  } catch (err) {
    console.error("User artists error:", err);
    res.redirect("/user?error=ไม่สามารถโหลดข้อมูลศิลปินได้");
  }
};

exports.concerts = async (_req, res) => {
  try {
    const concerts = await Concert.findAll({
      include: [{ association: "Artists", through: { attributes: [] } }],
      order: [["id", "DESC"]],
    });

    const concertsWithSeatStats = await attachSeatStats(concerts);
    res.render("user/concerts", { concerts: concertsWithSeatStats });
  } catch (err) {
    console.error("User concerts error:", err);
    res.redirect("/user?error=ไม่สามารถโหลดข้อมูลคอนเสิร์ตได้");
  }
};

exports.profile = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { CustomerId: req.authCustomer.id },
      include: [
        {
          model: Concert,
          include: [{ association: "Artists", through: { attributes: [] } }],
        },
      ],
      order: [["id", "DESC"]],
    });

    const groupedConcertBookings = bookings.reduce((acc, booking) => {
      const concert = booking.Concert;
      if (!concert) return acc;

      const concertId = Number(concert.id);
      if (!acc[concertId]) {
        acc[concertId] = {
          concert,
          bookingCount: 0,
          totalTicketsPurchased: 0,
          totalAmount: 0,
          latestStatus: booking.status,
        };
      }

      acc[concertId].bookingCount += 1;

      if (booking.status !== "cancelled") {
        acc[concertId].totalTicketsPurchased += Number(booking.quantity || 0);
        acc[concertId].totalAmount += Number(booking.totalPrice || 0);
      }

      return acc;
    }, {});


    return res.render("user/profile", {
      customer: req.authCustomer,
      concertBookings: Object.values(groupedConcertBookings),
    });
  } catch (error) {
    console.error("User profile error:", error);
    return res.render("user/profile", {
      customer: req.authCustomer,
      concertBookings: [],
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const authCustomer = req.authCustomer;
    const fullname = String(req.body.fullname || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phoneNumber = String(req.body.phoneNumber || "").trim();

    if (!fullname || !email || !phoneNumber) {
      return res.redirect("/user/profile?error=กรุณากรอกข้อมูลให้ครบ");
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.redirect("/user/profile?error=รูปแบบอีเมลไม่ถูกต้อง");
    }

    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.redirect(
        "/user/profile?error=เบอร์โทรต้องเป็นตัวเลข 8-15 หลัก",
      );
    }

    const duplicateEmail = await Customer.findOne({ where: { email } });
    if (
      duplicateEmail &&
      Number(duplicateEmail.id) !== Number(authCustomer.id)
    ) {
      return res.redirect("/user/profile?error=อีเมลนี้ถูกใช้งานแล้ว");
    }

    await authCustomer.update({ fullname, email, phoneNumber });
    return res.redirect("/user/profile?success=อัปเดตข้อมูลสำเร็จ");
  } catch (error) {
    console.error("User update profile error:", error);
    return res.redirect("/user/profile?error=ไม่สามารถอัปเดตข้อมูลได้");
  }
};