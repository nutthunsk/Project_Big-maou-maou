module.exports = (sequelize, DataTypes) => {
  // สร้าง Model Concert สำหรับเก็บข้อมูลคอนเสิร์ต
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

      // เวลาเริ่มคอนเสิร์ต
      ConcertTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },

      // รูปโปสเตอร์
      imagePath: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "/images/Poster.png",
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

      //FK ไป Artist (สำคัญมาก)
      ArtistId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "Concert",
      timestamps: false,
    },
  );
};
