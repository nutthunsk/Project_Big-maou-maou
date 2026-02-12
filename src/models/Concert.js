module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Concert", {
    concertName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    concertDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    venue: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
};
