// import model ที่เกี่ยวข้อง
const crypto = require("crypto");
const { Artist, Concert, Booking, Customer } = require("../models");
// import ฟังก์ชันจัดการ auth ของผู้ใช้
const {
  getAuthCustomer,
  setAuthCookie,
  clearAuthCookie,
} = require("../utils/user-auth");

// regex สำหรับตรวจสอบ email และเบอร์โทร
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const buildQuery = (params) => new URLSearchParams(params).toString();

const createPasswordHash = (plainPassword) => {
  const normalized = String(plainPassword || "");
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .scryptSync(normalized, salt, 64, { N: 16384, r: 8, p: 1 })
    .toString("hex");

  return `scrypt$${salt}$${derivedKey}`;
};

const isPasswordValid = (plainPassword, passwordHash) => {
  const normalized = String(plainPassword || "");
  const stored = String(passwordHash || "");
  if (!normalized || !stored.startsWith("scrypt$")) return false;

  const [, salt, hashedKey] = stored.split("$");
  if (!salt || !hashedKey) return false;

  const derivedKey = crypto
    .scryptSync(normalized, salt, 64, { N: 16384, r: 8, p: 1 })
    .toString("hex");

  const left = Buffer.from(derivedKey, "hex");
  const right = Buffer.from(hashedKey, "hex");
  if (left.length !== right.length) return false;

  return crypto.timingSafeEqual(left, right);
};

// helper: คำนวณจำนวนที่นั่งที่จองแล้วของแต่ละ concert
const attachSeatStats = async (concerts) => {
  const concertRows = Array.isArray(concerts) ? concerts : [];
  if (!concertRows.length) return [];

  // ดึง id ของ concert ทั้งหมด
  const concertIds = concertRows.map((concert) => concert.id);
  // ดึง booking ของ concert เหล่านี้
  const bookings = await Booking.findAll({
    where: { ConcertId: concertIds },
    attributes: ["ConcertId", "quantity", "status"],
  });

  // รวมจำนวนที่นั่งที่ถูกจอง (ไม่รวม cancelled)
  const bookedByConcertId = bookings.reduce((acc, booking) => {
    if (booking.status === "cancelled") return acc;
    const concertId = Number(booking.ConcertId);
    acc[concertId] = (acc[concertId] || 0) + Number(booking.quantity || 0);
    return acc;
  }, {});

  // เพิ่มข้อมูล seatStats ให้แต่ละ concert
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

// GET /user
// หน้า home ของ user
exports.home = async (_req, res) => {
  try {
    // ดึง artist และ concert ล่าสุด
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

// GET /user/login
// แสดงหน้า login
exports.loginForm = async (req, res) => {
  const authCustomer = await getAuthCustomer(req);
  if (authCustomer) {
    const redirectTo = String(req.query.redirect || "/user/concerts");
    return res.redirect(redirectTo);
  }

  return res.render("user/login", {
    redirectTo: String(req.query.redirect || "/user/concerts"),
    errorMessage: String(req.query.error || "").trim(),
    successMessage: String(req.query.success || "").trim(),
    formValues: {
      email: String(req.query.email || "").trim(),
    },
  });
};

// GET /user/register
// แสดงหน้าสมัครสมาชิก
exports.registerForm = async (req, res) => {
  const authCustomer = await getAuthCustomer(req);
  if (authCustomer) {
    const redirectTo = String(req.query.redirect || "/user/concerts");
    return res.redirect(redirectTo);
  }

  return res.render("user/register", {
    redirectTo: String(req.query.redirect || "/user/concerts"),
    errorMessage: String(req.query.error || "").trim(),
    formValues: {
      fullname: String(req.query.fullname || "").trim(),
      email: String(req.query.email || "").trim(),
      phoneNumber: String(req.query.phoneNumber || "").trim(),
    },
  });
};

// GET /user/forgot-password
// แสดงหน้าฟอร์มรีเซ็ตรหัสผ่าน
exports.forgotPasswordForm = async (req, res) => {
  const authCustomer = await getAuthCustomer(req);
  if (authCustomer) {
    return res.redirect("/user/profile");
  }

  return res.render("user/forgot-password", {
    errorMessage: String(req.query.error || "").trim(),
    successMessage: String(req.query.success || "").trim(),
    formValues: {
      email: String(req.query.email || "").trim(),
      phoneNumber: String(req.query.phoneNumber || "").trim(),
    },
  });
};

// POST /user/forgot-password
// รีเซ็ตรหัสผ่านด้วยการยืนยัน email + เบอร์โทร
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phoneNumber = String(req.body.phoneNumber || "").trim();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    const forgotQuery = {
      email,
      phoneNumber,
    };

    if (!email || !phoneNumber || !password || !confirmPassword) {
      return res.redirect(
        `/user/forgot-password?${buildQuery({
          ...forgotQuery,
          error: "Please fill in complete information",
        })}`,
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.redirect(
        `/user/forgot-password?${buildQuery({
          ...forgotQuery,
          error: "Please enter a valid email",
        })}`,
      );
    }

    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.redirect(
        `/user/forgot-password?${buildQuery({
          ...forgotQuery,
          error: "Please enter a 10-digit phone number",
        })}`,
      );
    }

    if (!PASSWORD_POLICY_REGEX.test(password)) {
      return res.redirect(
        `/user/forgot-password?${buildQuery({
          ...forgotQuery,
          error:
            "Password must be at least 8 characters and include letters and numbers",
        })}`,
      );
    }

    if (password !== confirmPassword) {
      return res.redirect(
        `/user/forgot-password?${buildQuery({
          ...forgotQuery,
          error: "Password and confirm password do not match",
        })}`,
      );
    }

    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return res.redirect(
        `/user/forgot-password?${buildQuery({
          ...forgotQuery,
          error: "Account not found",
        })}`,
      );
    }

    if (String(customer.phoneNumber || "").trim() !== phoneNumber) {
      return res.redirect(
        `/user/forgot-password?${buildQuery({
          ...forgotQuery,
          error: "Email and phone number do not match",
        })}`,
      );
    }

    await customer.update({
      passwordHash: createPasswordHash(password),
    });

    return res.redirect(
      "/user/login?success=Password reset successfully. Please log in again",
    );
  } catch (err) {
    console.error("User forgot password error:", err);
    return res.redirect("/user/forgot-password?error=Unable to reset password");
  }
};

// POST /user/register
// สมัครสมาชิก user ใหม่
exports.register = async (req, res) => {
  try {
    const fullname = String(req.body.fullname || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phoneNumber = String(req.body.phoneNumber || "").trim();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    const redirectTo = String(req.body.redirectTo || "/user/concerts");

    const registerQuery = {
      redirect: redirectTo,
      fullname,
      email,
      phoneNumber,
    };

    if (!fullname || !email || !phoneNumber || !password || !confirmPassword) {
      return res.redirect(
        `/user/register?${buildQuery({
          ...registerQuery,
          error: "Please fill in complete information",
        })}`,
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.redirect(
        `/user/register?${buildQuery({
          ...registerQuery,
          error: "Please enter a valid email",
        })}`,
      );
    }

    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.redirect(
        `/user/register?${buildQuery({
          ...registerQuery,
          error: "Please enter a 10-digit phone number",
        })}`,
      );
    }

    if (!PASSWORD_POLICY_REGEX.test(password)) {
      return res.redirect(
        `/user/register?${buildQuery({
          ...registerQuery,
          error:
            "Password must be at least 8 characters and include letters and numbers",
        })}`,
      );
    }

    if (password !== confirmPassword) {
      return res.redirect(
        `/user/register?${buildQuery({
          ...registerQuery,
          error: "Password and confirm password do not match",
        })}`,
      );
    }

    const duplicateCustomer = await Customer.findOne({ where: { email } });
    if (duplicateCustomer && duplicateCustomer.passwordHash) {
      return res.redirect(
        `/user/register?${buildQuery({
          ...registerQuery,
          error: "This email is already registered",
        })}`,
      );
    }

    let customer;
    if (duplicateCustomer && !duplicateCustomer.passwordHash) {
      await duplicateCustomer.update({
        fullname,
        phoneNumber,
        passwordHash: createPasswordHash(password),
      });
      customer = duplicateCustomer;
    } else {
      customer = await Customer.create({
        fullname,
        email,
        phoneNumber,
        passwordHash: createPasswordHash(password),
      });
    }

    setAuthCookie(res, customer.id);
    return res.redirect(redirectTo || "/user/concerts");
  } catch (err) {
    console.error("User register error:", err);
    return res.redirect("/user/register?error=Unable to register account");
  }
};

// POST /user/login
// login user ที่สมัครแล้ว
exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const redirectTo = String(req.body.redirectTo || "/user/concerts");

    const loginQuery = {
      redirect: redirectTo,
      email,
    };

    if (!email || !password) {
      return res.redirect(
        `/user/login?${buildQuery({
          ...loginQuery,
          error: "Please fill in email and password",
        })}`,
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.redirect(
        `/user/login?${buildQuery({
          ...loginQuery,
          error: "Please enter a valid email",
        })}`,
      );
    }

    const customer = await Customer.findOne({ where: { email } });
    if (!customer || !customer.passwordHash) {
      return res.redirect(
        `/user/login?${buildQuery({
          ...loginQuery,
          error:
            "Account not found or password not set. Please register before login",
        })}`,
      );
    }

    if (!isPasswordValid(password, customer.passwordHash)) {
      return res.redirect(
        `/user/login?${buildQuery({
          ...loginQuery,
          error: "Invalid email or password",
        })}`,
      );
    }

    setAuthCookie(res, customer.id);
    return res.redirect(redirectTo || "/user/concerts");
  } catch (err) {
    console.error("User login error:", err);
    return res.redirect("/user/login?error=Unable to log in");
  }
};

// GET /user/logout
// logout ผู้ใช้
exports.logout = (_req, res) => {
  clearAuthCookie(res);
  return res.redirect("/user?success=Log out successfully");
};

// GET /user/artists
// แสดงรายชื่อศิลปิน
exports.artists = async (req, res) => {
  try {
    const artistQuery = String(req.query.q || "").trim();
    const artists = await Artist.findAll({
      include: [{ association: "Concerts", through: { attributes: [] } }],
      order: [["id", "ASC"]],
    });

    const normalizedArtistQuery = artistQuery.toLowerCase();
    const filteredArtists = normalizedArtistQuery
      ? artists.filter((artist) => {
          const artistName = String(artist.ArtistName || "").toLowerCase();
          const genre = String(artist.genre || "").toLowerCase();
          return (
            artistName.includes(normalizedArtistQuery) ||
            genre.includes(normalizedArtistQuery)
          );
        })
      : artists;

    res.render("user/artists", {
      artists: filteredArtists,
      artistQuery,
    });
  } catch (err) {
    console.error("User artists error:", err);
    res.redirect("/user?error=Unable to load artist information");
  }
};

// GET /user/concerts
// แสดงคอนเสิร์ตทั้งหมด พร้อมจำนวนที่นั่ง
exports.concerts = async (req, res) => {
  try {
    const concertQuery = String(req.query.q || "").trim();
    const concerts = await Concert.findAll({
      include: [{ association: "Artists", through: { attributes: [] } }],
      order: [["id", "DESC"]],
    });

    const concertsWithSeatStats = await attachSeatStats(concerts);
    const normalizedConcertQuery = concertQuery.toLowerCase();

    const filteredConcerts = normalizedConcertQuery
      ? concertsWithSeatStats.filter((concert) => {
          const concertName = String(concert.ConcertName || "").toLowerCase();
          const venue = String(concert.venue || "").toLowerCase();
          const artistNames = Array.isArray(concert.Artists)
            ? concert.Artists.map((artist) =>
                String(artist.ArtistName || "").toLowerCase(),
              )
            : [];

          return (
            concertName.includes(normalizedConcertQuery) ||
            venue.includes(normalizedConcertQuery) ||
            artistNames.some((name) => name.includes(normalizedConcertQuery))
          );
        })
      : concertsWithSeatStats;

    res.render("user/concerts", {
      concerts: filteredConcerts,
      concertQuery,
    });
  } catch (err) {
    console.error("User concerts error:", err);
    res.redirect("/user?error=The concert information could not be loaded");
  }
};

// GET /user/profile
// หน้าโปรไฟล์ + ประวัติการจอง
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

    // รวมข้อมูลการจองตาม concert
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
          latestBookingId: booking.id,
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

// GET /user/bookings/:id/receipt
// แสดงใบจองของผู้ใช้ที่ล็อกอินอยู่
exports.bookingReceipt = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.redirect("/user/profile?error=Invalid booking id");
    }

    const booking = await Booking.findOne({
      where: {
        id: bookingId,
        CustomerId: req.authCustomer.id,
      },
      include: [
        {
          model: Concert,
          include: [{ association: "Artists", through: { attributes: [] } }],
        },
        {
          model: Customer,
        },
      ],
    });

    if (!booking) {
      return res.redirect("/user/profile?error=Booking not found");
    }

    const concertId = booking.Concert ? Number(booking.Concert.id) : null;
    let receiptSummary = {
      totalTicketsPurchased: Number(booking.quantity || 0),
      totalAmount: Number(booking.totalPrice || 0),
      latestStatus: booking.status,
    };

    if (concertId) {
      const concertBookings = await Booking.findAll({
        where: {
          CustomerId: req.authCustomer.id,
          ConcertId: concertId,
        },
        order: [["id", "DESC"]],
      });

      receiptSummary = concertBookings.reduce(
        (acc, concertBooking) => {
          if (concertBooking.status !== "cancelled") {
            acc.totalTicketsPurchased += Number(concertBooking.quantity || 0);
            acc.totalAmount += Number(concertBooking.totalPrice || 0);
          }
          return acc;
        },
        {
          totalTicketsPurchased: 0,
          totalAmount: 0,
          latestStatus: concertBookings[0]?.status || booking.status,
        },
      );
    }

    return res.render("user/booking-receipt", {
      booking,
      customer: req.authCustomer,
      receiptSummary,
    });
  } catch (error) {
    console.error("User booking receipt error:", error);
    return res.redirect("/user/profile?error=Unable to load booking receipt");
  }
};

// POST /user/profile
// แก้ไขข้อมูลผู้ใช้
exports.updateProfile = async (req, res) => {
  try {
    const authCustomer = req.authCustomer;
    const fullname = String(req.body.fullname || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phoneNumber = String(req.body.phoneNumber || "").trim();

    // ตรวจสอบข้อมูล
    if (!fullname || !email || !phoneNumber) {
      return res.redirect(
        "/user/profile?error=Please fill in complete information",
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.redirect("/user/profile?error=Invalid email format");
    }

    if (!PHONE_REGEX.test(phoneNumber)) {
      return res.redirect(
        "/user/profile?error=The phone number must be 8-15 digits long",
      );
    }

    // ตรวจสอบ email ซ้ำ
    const duplicateEmail = await Customer.findOne({ where: { email } });
    if (
      duplicateEmail &&
      Number(duplicateEmail.id) !== Number(authCustomer.id)
    ) {
      return res.redirect(
        "/user/profile?error=This email address is already in use",
      );
    }

    // อัปเดตข้อมูล
    await authCustomer.update({ fullname, email, phoneNumber });
    return res.redirect("/user/profile?success=Data updated successfully");
  } catch (error) {
    console.error("User update profile error:", error);
    return res.redirect("/user/profile?error=Unable to update information");
  }
};
