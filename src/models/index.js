const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "../../Database/database.sqlite"),
  logging: false,
});

// 1️⃣ init models (ประกาศให้ครบก่อน)
const Artist = require("./Artist")(sequelize, DataTypes);
const Concert = require("./Concert")(sequelize, DataTypes);
const Customer = require("./Customer")(sequelize, DataTypes);
const Booking = require("./Booking")(sequelize, DataTypes);

// 2️⃣ relations (ค่อยผูกทีหลัง)
Artist.hasMany(Concert, { foreignKey: "ArtistId" });
Concert.belongsTo(Artist, { foreignKey: "ArtistId" });

Customer.hasMany(Booking, { foreignKey: "CustomerId" });
Booking.belongsTo(Customer, { foreignKey: "CustomerId" });

Concert.hasMany(Booking, { foreignKey: "ConcertId" });
Booking.belongsTo(Concert, { foreignKey: "ConcertId" });

// 3️⃣ export ทีเดียว
module.exports = {
  sequelize,
  Artist,
  Concert,
  Customer,
  Booking,
};
