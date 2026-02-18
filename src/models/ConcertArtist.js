module.exports = (sequelize, DataTypes) => {
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
