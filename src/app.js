const express = require("express");          // framework สำหรับสร้างเว็บเซิร์ฟเวอร์
const path = require("path");                // จัดการ path ไฟล์ให้ทำงานได้ทุก OS

const { sequelize, Artist, Concert, Customer } = require("./models");

const app = express();

// ===== port config =====
const PORT = process.env.PORT || 3000;       // ใช้ PORT จาก env ถ้าไม่มีใช้ 3000

const DEFAULT_HOME_PAYLOAD = {
  stats: { artistCount: 0, concertCount: 0, customerCount: 0 },
  featuredConcerts: [],
};

// ===== DB (เช็ค + sync ทันที) =====
sequelize.authenticate().catch((err) =>
  console.error("DB error:", err)             // ตรวจสอบการเชื่อมต่อ DB
);

sequelize.sync().catch((err) =>
  console.error(err)                          // sync model กับ database
);

// ===== middleware =====
app.use(express.urlencoded({ extended: false }));
// รับข้อมูลจาก form (application/x-www-form-urlencoded)

app.use(express.json());
// รับข้อมูล JSON จาก request body

app.use(express.static(path.join(__dirname, "../public")));
// ให้เข้าถึงไฟล์ static เช่น css, js, รูปภาพ

// ===== routes =====
const artistRoutes = require("./routes/artist.routes");     // route ศิลปิน
const concertRoutes = require("./routes/concert.routes");   // route คอนเสิร์ต
const bookingRoutes = require("./routes/booking.routes");   // route การจอง
const customerRoutes = require("./routes/customer.routes"); // route ลูกค้า

// ผูก route เข้ากับ prefix
app.use("/artists", artistRoutes);
app.use("/concerts", concertRoutes);
app.use("/bookings", bookingRoutes);
app.use("/customers", customerRoutes);

// ===== view engine =====
app.set("view engine", "ejs");                // ใช้ EJS เป็น template engine
app.set("views", path.join(__dirname, "views"));
// กำหนดโฟลเดอร์เก็บไฟล์ .ejs

// ===== test route =====
// ===== homepage =====
app.get("/", async (req, res) => {
  try {
    const [artistCount, concertCount, customerCount, featuredConcerts] = await Promise.all([
      Artist.count(),
      Concert.count(),
      Customer.count(),
      Concert.findAll({
        include: [{ association: "Artists", through: { attributes: [] } }],
        order: [["ConcertDate", "ASC"]],
        limit: 3,
      }),
    ]);

    return res.render("home", {
      stats: { artistCount, concertCount, customerCount },
      featuredConcerts,
    });
  } catch (err) {
    console.error("Home page data error:", err.message);
    return res.render("home", DEFAULT_HOME_PAYLOAD);
  }
});

// ===== function: init database =====
async function initDb() {
  await sequelize.authenticate(); // ตรวจสอบการเชื่อมต่อ DB
  await sequelize.sync();         // sync ตารางกับ model
}

// ===== function: start server =====
async function startServer() {
  try {
    await initDb();               // เชื่อม DB ก่อนเปิด server

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("DB error:", err);
    process.exit(1);              // ถ้า DB พัง ให้หยุดโปรแกรม
  }
}

// ===== run server เฉพาะตอนรันไฟล์นี้ตรง ๆ =====
if (require.main === module) {
  startServer();
}

// ===== export =====
module.exports = app;             // export app (ใช้กับ test)
module.exports.initDb = initDb;   // export initDb เผื่อเรียกจากไฟล์อื่น