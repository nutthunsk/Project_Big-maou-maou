module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Concert",
    {
      // ID_Con (PK)
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // ConcertName
      ConcertName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // venue
      venue: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // ConcertDate
      ConcertDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      // totalSeats
      totalSeats: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // price
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      // ArtistId → FK (สร้างจาก relation)
    },
    {
      tableName: "Concert",
      timestamps: false,
    },
  );
};
