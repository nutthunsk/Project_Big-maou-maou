// Express framework สำหรับสร้างเว็บเซิร์ฟเวอร์
const express = require("express");
// ใช้จัดการ path ของไฟล์ให้รองรับทุก OS
const path = require("path");
// DataTypes ใช้กำหนดชนิดข้อมูลของ column ใน Sequelize
const { DataTypes } = require("sequelize");
// ดึง database instance และ model ต่าง ๆ
const { sequelize, Artist, Concert, Customer, Booking } = require("./models");

// import routes
// route จัดการข้อมูลศิลปิน
const artistRoutes = require("./routes/artist.routes");
// route จัดการข้อมูลคอนเสิร์ต
const concertRoutes = require("./routes/concert.routes");
// route จัดการการจองบัตร
const bookingRoutes = require("./routes/booking.routes");
// route จัดการข้อมูลลูกค้า
const customerRoutes = require("./routes/customer.routes");
// route รายงาน (report)
const reportRoutes = require("./routes/report.routes");
// route ฝั่ง user
const userRoutes = require("./routes/user.routes");
// controller สำหรับหน้า user
const userController = require("./controllers/user.controller");
// ฟังก์ชันเช็คว่ามีลูกค้าล็อกอินอยู่หรือไม่
const { getAuthCustomer } = require("./utils/user-auth");

// สร้าง express app และกำหนด port
const app = express();
// ใช้ port จาก environment ถ้ามี ไม่งั้นใช้ 3000
const PORT = process.env.PORT || 3000;

// ตั้งค่า view engine
// ใช้ EJS เป็น template engine
app.set("view engine", "ejs");
// กำหนดโฟลเดอร์เก็บไฟล์ .ejs
app.set("views", path.join(__dirname, "views"));
// รับข้อมูลจาก form (POST)
app.use(express.urlencoded({ extended: false }));
// รับข้อมูลแบบ JSON
app.use(express.json());
// เปิดให้เข้าถึงไฟล์ในโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "../public")));
// ใช้กรณีส่ง _method=PUT หรือ DELETE ผ่าน form
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object" && req.body._method) {
    // เปลี่ยน method ของ request
    req.method = String(req.body._method).toUpperCase();
    delete req.body._method;
  }
  next();
});

// flash message ผ่าน query string
// ส่งข้อความ success / error ไปใช้ใน view
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.query.success || "",
    error: req.query.error || "",
  };
  next();
});

// แนบข้อมูลลูกค้าที่ล็อกอิน
// ตรวจสอบว่ามี customer login อยู่หรือไม่
app.use(async (req, res, next) => {
  try {
    // เก็บข้อมูลลูกค้าที่ล็อกอินไว้ใช้ใน EJS
    res.locals.authCustomer = await getAuthCustomer(req);
  } catch (error) {
    console.error("Attach auth customer error:", error);
    res.locals.authCustomer = null;
  }
  next();
});

// ฟังก์ชัน render หน้า admin dashboard
const renderAdminDashboard = async (res) => {
  try {
    // ดึงข้อมูลหลายอย่างพร้อมกันเพื่อความเร็ว
    const [
      artistCount,
      concertCount,
      customerCount,
      bookingCount,
      latestBookings,
      latestConcerts,
      latestArtists,
    ] = await Promise.all([
      Artist.count(), // จำนวนศิลปิน
      Concert.count(), // จำนวนคอนเสิร์ต
      Customer.count(), // จำนวนลูกค้า
      Booking.count(), // จำนวนการจอง

      // การจองล่าสุด 5 รายการ
      Booking.findAll({
        include: [Concert, Customer],
        order: [["id", "DESC"]],
        limit: 5,
      }),

      // ศิลปินล่าสุด 5 รายการ
      Concert.findAll({
        include: [{ association: "Artists", through: { attributes: [] } }],
        order: [
          ["ConcertDate", "DESC"],
          ["id", "DESC"],
        ],
        limit: 5,
      }),

      // ศิลปินล่าสุด 5 รายการ
      Artist.findAll({
        include: [{ association: "Concerts", through: { attributes: [] } }],
        order: [["id", "DESC"]],
        limit: 5,
      }),
    ]);

    // render หน้า home (admin dashboard)
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
    // ถ้า error ให้ render หน้าเดิมแต่ข้อมูลว่าง
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

// routes หลักของระบบ
app.use("/artists", artistRoutes);
app.use("/concerts", concertRoutes);
app.use("/bookings", bookingRoutes);
app.use("/customers", customerRoutes);
app.use("/reports", reportRoutes);
app.use("/user", userRoutes);

// หน้าแรกของเว็บ
app.get("/", userController.home);
// หน้า admin dashboard
app.get("/admin", async (_req, res) => {
  return renderAdminDashboard(res);
});

// ตรวจสอบและเพิ่ม column ให้ตาราง Concert
const ensureConcertColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    // อ่านโครงสร้างตาราง Concert
    const tableInfo = await queryInterface.describeTable("Concert");

    // ถ้ายังไม่มี ConcertTime ให้เพิ่ม
    if (!tableInfo.ConcertTime) {
      await queryInterface.addColumn("Concert", "ConcertTime", {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: "19:00:00",
      });
    }

    // ถ้ายังไม่มี imagePath ให้เพิ่ม
    if (!tableInfo.imagePath) {
      await queryInterface.addColumn("Concert", "imagePath", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "/images/Poster.png",
      });
    }
  } catch (error) {
    // ถ้ายังไม่มีตาราง Concert ให้ข้าม
    if (String(error.message || "").includes("no such table")) return;
    throw error;
  }
};

// init database
async function initDb() {
  // ตรวจสอบการเชื่อมต่อ database
  await sequelize.authenticate();
  // sync model กับ database
  await sequelize.sync();
  // ตรวจสอบ column ที่จำเป็น
  await ensureConcertColumns();
}

// start server

async function startServer() {
  try {
    // เตรียม database ก่อน
    await initDb();
    // เปิด server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("DB error:", err);
    process.exit(1);
  }
}

// รัน server เฉพาะตอนเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  startServer();
}

// export app สำหรับใช้กับ test หรือไฟล์อื่น
module.exports = app;
// export initDb เผื่อเรียกใช้งานภายนอก
module.exports.initDb = initDb;
