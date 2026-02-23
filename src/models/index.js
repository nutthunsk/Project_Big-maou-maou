const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

// สร้าง instance ของ Sequelize
// ใช้ฐานข้อมูล SQLite และเก็บไฟล์ database.sqlite
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "../../Database/database.sqlite"),
  logging: false,
});

// init models (โหลด Model ทั้งหมด)
const Artist = require("./Artist")(sequelize, DataTypes);
const Concert = require("./Concert")(sequelize, DataTypes);
const Customer = require("./Customer")(sequelize, DataTypes);
const Booking = require("./Booking")(sequelize, DataTypes);
const ConcertArtist = require("./ConcertArtist")(sequelize, DataTypes);

// relations (กำหนดความสัมพันธ์)
// Artist 1 คน สามารถมี Concert หลักได้หลายรายการ (One-to-Many)
Artist.hasMany(Concert, { foreignKey: "ArtistId", as: "PrimaryConcerts" });
Concert.belongsTo(Artist, { foreignKey: "ArtistId", as: "PrimaryArtist" });

// Artist ↔ Concert (Many-to-Many)
// ใช้ตารางกลาง ConcertArtist
Artist.belongsToMany(Concert, {
  through: ConcertArtist,
  as: "Concerts",
  foreignKey: "ArtistId",
  otherKey: "ConcertId",
});
Concert.belongsToMany(Artist, {
  through: ConcertArtist,
  as: "Artists",
  foreignKey: "ConcertId",
  otherKey: "ArtistId",
});

// Customer 1 คน สามารถจองได้หลาย Booking (One-to-Many)
Customer.hasMany(Booking, { foreignKey: "CustomerId" });
Booking.belongsTo(Customer, { foreignKey: "CustomerId" });

// Concert 1 งาน มี Booking ได้หลายรายการ (One-to-Many)
Concert.hasMany(Booking, { foreignKey: "ConcertId" });
Booking.belongsTo(Concert, { foreignKey: "ConcertId" });

// export model ทั้งหมด
module.exports = {
  sequelize,
  Artist,
  Concert,
  Customer,
  Booking,
  ConcertArtist,
};
