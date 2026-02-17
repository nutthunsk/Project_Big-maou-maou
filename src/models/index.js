const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "../../Database/database.sqlite"),
  logging: false,
});

// init models (ประกาศให้ครบก่อน)
const Artist = require("./Artist")(sequelize, DataTypes);
const Concert = require("./Concert")(sequelize, DataTypes);
const Customer = require("./Customer")(sequelize, DataTypes);
const Booking = require("./Booking")(sequelize, DataTypes);
const ConcertArtist = require("./ConcertArtist")(sequelize, DataTypes);

// relations (ค่อยผูกทีหลัง)
Artist.hasMany(Concert, { foreignKey: "ArtistId", as: "PrimaryConcerts" });
Concert.belongsTo(Artist, { foreignKey: "ArtistId", as: "PrimaryArtist" });

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

Customer.hasMany(Booking, { foreignKey: "CustomerId" });
Booking.belongsTo(Customer, { foreignKey: "CustomerId" });

Concert.hasMany(Booking, { foreignKey: "ConcertId" });
Booking.belongsTo(Concert, { foreignKey: "ConcertId" });

// export ทีเดียว
module.exports = {
  sequelize,
  Artist,
  Concert,
  Customer,
  Booking,
  ConcertArtist,
};
