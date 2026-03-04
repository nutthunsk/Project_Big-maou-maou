// Express framework สำหรับสร้างเว็บเซิร์ฟเวอร์
const express = require("express");
// ใช้จัดการ path ให้รองรับทุก OS
const path = require("path");
// DataTypes ใช้กำหนดชนิดข้อมูลของ column ใน Sequelize
const { DataTypes } = require("sequelize");
// ดึง database instance และ model ต่าง ๆ
const { sequelize, Artist, Concert, Customer, Booking } = require("./models");
// เปิด CORS (กรณีเรียกจาก port อื่น)
const cors = require("cors");
// route จัดการข้อมูลศิลปิน
const artistRoutes = require("./routes/artist.routes");
// route จัดการข้อมูลคอนเสิร์ต
const concertRoutes = require("./routes/concert.routes");
// route จัดการการจองบัตร
const bookingRoutes = require("./routes/booking.routes");
// route จัดการข้อมูลลูกค้า
const customerRoutes = require("./routes/customer.routes");
// route รายงาน
const reportRoutes = require("./routes/report.routes");
const app = express();
// ใช้ port 5000
const PORT = process.env.PORT || 5000;

// เปิดใช้งาน CORS
app.use(cors());
// ตั้งค่า view engine เป็น EJS
app.set("view engine", "ejs");
// กำหนดโฟลเดอร์เก็บไฟล์ .ejs
app.set("views", path.join(__dirname, "views"));
// รับข้อมูลจาก form (POST)
app.use(express.urlencoded({ extended: false }));
// รับข้อมูลแบบ JSON
app.use(express.json());
// เปิดให้เข้าถึงไฟล์ในโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "../public")));

// รองรับการส่ง _method=PUT หรือ DELETE ผ่าน form
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

const renderAdminDashboard = async (res) => {
  try {
    // ดึงข้อมูลหลายอย่างพร้อมกันเพื่อให้เร็วขึ้น
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

      // ดึงการจองล่าสุด 5 รายการ
      Booking.findAll({
        include: [Concert, Customer],
        order: [["id", "DESC"]],
        limit: 5,
      }),

      // ดึงคอนเสิร์ตล่าสุด 5 รายการ
      Concert.findAll({
        include: [{ association: "Artists", through: { attributes: [] } }],
        order: [
          ["ConcertDate", "DESC"],
          ["id", "DESC"],
        ],
        limit: 5,
      }),

      // ดึงศิลปินล่าสุด 5 รายการ
      Artist.findAll({
        include: [{ association: "Concerts", through: { attributes: [] } }],
        order: [["id", "DESC"]],
        limit: 5,
      }),
    ]);

    // render หน้า dashboard
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

    // ถ้า error ให้แสดงข้อมูลว่าง
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

// ใช้งาน route หลักของระบบ
app.use("/artists", artistRoutes);
app.use("/concerts", concertRoutes);
app.use("/bookings", bookingRoutes);
app.use("/customers", customerRoutes);
app.use("/reports", reportRoutes);

// ⭐ เข้า root แล้วแสดง dashboard เลย
app.get("/", async (_req, res) => {
  return renderAdminDashboard(res);
});

// ตรวจสอบและเพิ่ม column ให้ตาราง Concert
const ensureConcertColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const tableInfo = await queryInterface.describeTable("Concert");

    if (!tableInfo.ConcertTime) {
      await queryInterface.addColumn("Concert", "ConcertTime", {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: "19:00:00",
      });
    }

    if (!tableInfo.imagePath) {
      await queryInterface.addColumn("Concert", "imagePath", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "/images/Poster.png",
      });
    }

  } catch (error) {
    if (String(error.message || "").includes("no such table")) return;
    throw error;
  }
};

// ตรวจสอบและเพิ่ม column ให้ตาราง Customers
const ensureCustomerColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const tableInfo = await queryInterface.describeTable("Customers");

    if (!tableInfo.passwordHash) {
      await queryInterface.addColumn("Customers", "passwordHash", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

  } catch (error) {
    if (String(error.message || "").includes("no such table")) return;
    throw error;
  }
};

async function initDb() {
  await sequelize.authenticate();  // เชื่อมต่อฐานข้อมูล
  await sequelize.sync();          // sync model
  await ensureConcertColumns();    // ตรวจสอบ column
  await ensureCustomerColumns();   // ตรวจสอบ column
}

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

// รัน server เมื่อเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  startServer();
}

// export ไว้ใช้ test
module.exports = app;
module.exports.initDb = initDb;