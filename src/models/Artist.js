module.exports = (sequelize, DataTypes) => {
  // สร้าง Model ชื่อ Artist ผูกกับ Sequelize
  return sequelize.define(
    "Artist",
    {
      // ID_Artist (PK)
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // ArtistName
      ArtistName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // genre
      genre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "Artist",
      timestamps: false,
    },
  );
};
