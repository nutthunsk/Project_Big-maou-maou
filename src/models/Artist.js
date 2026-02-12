module.exports = (sequelize, DataTypes) => {
  const Artist = sequelize.define("Artist", {
    artistName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    genre: DataTypes.STRING,
  });

  return Artist;
};
