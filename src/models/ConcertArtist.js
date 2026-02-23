module.exports = (sequelize, DataTypes) => {
  // Model ConcertArtist ใช้เป็นตารางกลาง (Junction Table)
  // สำหรับเชื่อมความสัมพันธ์แบบ Many-to-Many
  // ระหว่าง Concert และ Artist
  return sequelize.define(
    "ConcertArtist",
    {
      ConcertId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      ArtistId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      tableName: "ConcertArtist",
      timestamps: false,
    },
  );
};
