const express = require("express");          // framework สำหรับสร้างเว็บเซิร์ฟเวอร์
const path = require("path");                // จัดการ path ไฟล์ให้ทำงานได้ทุก OS
const { sequelize, Artist, Concert, Customer, Booking } = require("./models");
const artistRoutes = require("./routes/artist.routes");
const concertRoutes = require("./routes/concert.routes");
const bookingRoutes = require("./routes/booking.routes");
const customerRoutes = require("./routes/customer.routes");
const reportRoutes = require("./routes/report.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object" && req.body._method) {
    req.method = String(req.body._method).toUpperCase();
    delete req.body._method;
  }
  next();
});

app.use((req, res, next) => {
  res.locals.flash = {
    success: req.query.success || "",
    error: req.query.error || "",
  };
  next();
});

app.use("/artists", artistRoutes);
app.use("/concerts", concertRoutes);
app.use("/bookings", bookingRoutes);
app.use("/customers", customerRoutes);
app.use("/reports", reportRoutes);

app.get("/", async (_req, res) => {
  try {
     const [artistCount, concertCount, customerCount, bookingCount, latestBookings] = await Promise.all([
      Artist.count(),
      Concert.count(),
      Customer.count(),
      Booking.count(),
      Booking.findAll({
        include: [Concert, Customer],
        order: [["id", "DESC"]],
        limit: 5,
      }),
    ]);

    return res.render("home", {
      stats: { artistCount, concertCount, customerCount, bookingCount },
      latestBookings,
    });
  } catch (err) {
    console.error("Home page data error:", err.message);
    return res.render("home", {
      stats: { artistCount: 0, concertCount: 0, customerCount: 0, bookingCount: 0 },
      latestBookings: [],
    });
  }
});

// ===== function: init database =====
async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
}

// ===== function: start server =====
async function startServer() {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("DB error:", err);
    process.exit(1);
  }
}

// ===== run server เฉพาะตอนรันไฟล์นี้ตรง ๆ =====
if (require.main === module) {
  startServer();
}

// ===== export =====
module.exports = app;
module.exports.initDb = initDb;