module.exports = (sequelize, DataTypes) => {
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
