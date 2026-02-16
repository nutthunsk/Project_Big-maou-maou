module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Concert",
    {
      // PK
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // ชื่อคอนเสิร์ต
      ConcertName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // สถานที่
      venue: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // วันที่แสดง
      ConcertDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      // จำนวนที่นั่ง
      totalSeats: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // ราคา
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      // 🔑 FK ไป Artist (สำคัญมาก)
      ArtistId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "Concert",
      timestamps: false,
    }
  );
};