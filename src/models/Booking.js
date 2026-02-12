module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Booking", {
    seatNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paymentStatus: {
      type: DataTypes.STRING,
      defaultValue: "PENDING",
    },
  });
};
