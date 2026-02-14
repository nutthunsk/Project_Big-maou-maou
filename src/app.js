const express = require("express");
const path = require("path");

const { sequelize } = require("./models");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== DB =====
sequelize.authenticate().catch((err) => console.error("DB error:", err));
sequelize.sync().catch((err) => console.error(err));

// ===== middleware =====
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // ✅ เพิ่มอันนี้ (สำคัญ)
app.use(express.static(path.join(__dirname, "public")));

// ===== routes =====
const artistRoutes = require("./routes/artist.routes");
const concertRoutes = require("./routes/concert.routes");
const bookingRoutes = require("./routes/booking.routes"); // ✅ เพิ่ม
const customerRoutes = require("./routes/customer.routes");

app.use("/artists", artistRoutes);
app.use("/concerts", concertRoutes);
app.use("/bookings", bookingRoutes); // ✅ เพิ่ม
app.use("/customers", customerRoutes);

// ===== view engine =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== test route =====
app.get("/", (req, res) => {
  res.send("Big maou maou is running ");
});

// ===== start server =====
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
