const express = require("express");
const path = require("path");

// route ฝั่งผู้ใช้
const userRoutes = require("./routes/user.routes");
// route ที่ผู้ใช้ใช้ในขั้นตอนจองบัตร
const concertRoutes = require("./routes/concert.routes");
const bookingRoutes = require("./routes/booking.routes");
// controller หน้า user
const userController = require("./controllers/user.controller");
// helper auth ผู้ใช้
const { getAuthCustomer } = require("./utils/user-auth");
// ใช้ init database เดียวกับฝั่ง admin
const { initDb } = require("./app");

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// รองรับ _method=PUT/DELETE จาก form
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

// แนบข้อมูลผู้ใช้ที่ล็อกอิน
app.use(async (req, res, next) => {
  try {
    res.locals.authCustomer = await getAuthCustomer(req);
  } catch (error) {
    console.error("Attach auth customer error:", error);
    res.locals.authCustomer = null;
  }
  next();
});

// routes ฝั่งผู้ใช้
app.use("/user", userRoutes);
app.use("/concerts", concertRoutes);
app.use("/bookings", bookingRoutes);

// หน้าแรกของ frontend
app.get("/", userController.home);

async function startFrontend() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Frontend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Frontend start error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startFrontend();
}

module.exports = app;