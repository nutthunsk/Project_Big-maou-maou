const express = require("express"); // framework สำหรับเว็บเซิร์ฟเวอร์
const path = require("path"); // จัดการ path ให้ข้าม OS ได้
const { sequelize, Artist, Concert, Customer, Booking } = require("./models");

// ===== routes =====
const artistRoutes = require("./routes/artist.routes");
const concertRoutes = require("./routes/concert.routes");
const bookingRoutes = require("./routes/booking.routes");
const customerRoutes = require("./routes/customer.routes");
const reportRoutes = require("./routes/report.routes");
const userRoutes = require("./routes/user.routes");
const userController = require("./controllers/user.controller");
const { getAuthCustomer } = require("./utils/user-auth");

const app = express();
const PORT = process.env.PORT || 3000;

// view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static("public"));

// static files
app.use(express.static(path.join(__dirname, "../public")));

// method override (?_method=PUT / DELETE)
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object" && req.body._method) {
    req.method = String(req.body._method).toUpperCase();
    delete req.body._method;
  }
  next();
});

// flash message ผ่าน query string
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.query.success || "",
    error: req.query.error || "",
  };
  next();
});


app.use(async (req, res, next) => {
  try {
    res.locals.authCustomer = await getAuthCustomer(req);
  } catch (error) {
    console.error("Attach auth customer error:", error);
    res.locals.authCustomer = null;
  }
  next();
});

const renderAdminDashboard = async (res) => {
  try {
    const [
      artistCount,
      concertCount,
      customerCount,
      bookingCount,
      latestBookings,
      latestConcerts,
      latestArtists,
    ] = await Promise.all([
      Artist.count(),
      Concert.count(),
      Customer.count(),
      Booking.count(),
      Booking.findAll({
        include: [Concert, Customer],
        order: [["id", "DESC"]],
        limit: 5,
      }),
      Concert.findAll({
        include: [{ association: "Artists", through: { attributes: [] } }],
        order: [
          ["ConcertDate", "DESC"],
          ["id", "DESC"],
        ],
        limit: 5,
      }),
      Artist.findAll({
        include: [{ association: "Concerts", through: { attributes: [] } }],
        order: [["id", "DESC"]],
        limit: 5,
      }),
    ]);

    return res.render("home", {
      stats: {
        artistCount,
        concertCount,
        customerCount,
        bookingCount,
      },
      latestBookings,
      latestConcerts,
      latestArtists,
    });
  } catch (err) {
    console.error("Home page error:", err);
    return res.render("home", {
      stats: {
        artistCount: 0,
        concertCount: 0,
        customerCount: 0,
        bookingCount: 0,
      },
      latestBookings: [],
      latestConcerts: [],
      latestArtists: [],
    });
  }
};

// routes
app.use("/artists", artistRoutes);
app.use("/concerts", concertRoutes);
app.use("/bookings", bookingRoutes);
app.use("/customers", customerRoutes);
app.use("/reports", reportRoutes);
app.use("/user", userRoutes);

app.get("/", userController.home);

app.get("/admin", async (_req, res) => {
  return renderAdminDashboard(res);
});

// database init
async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
    const [concertColumns] = await sequelize.query(
    "PRAGMA table_info('Concert')",
  );

  const hasImageUrl = concertColumns.some(
    (column) => column.name === "imageUrl",
  );
  if (!hasImageUrl) {
    await sequelize.query(
      "ALTER TABLE Concert ADD COLUMN imageUrl VARCHAR(255)",
    );
  }
}

// start server
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("DB error:", err);
    process.exit(1);
  }
}

// รัน server เฉพาะตอนเรียกไฟล์นี้ตรง ๆ
if (require.main === module) {
  startServer();
}

// exports
module.exports = app;
module.exports.initDb = initDb;
