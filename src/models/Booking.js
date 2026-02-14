module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Booking",
    {
      bookingDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "paid", "cancelled"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "Bookings",
      timestamps: false,
    }
  );
};