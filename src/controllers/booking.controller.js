const { Booking, Concert, Customer } = require("../models");

exports.create = async (req, res) => {
  await Booking.create({
    seatNumber: req.body.seatNumber,
    CustomerId: req.body.CustomerId,
    ConcertId: req.body.ConcertId,
  });
  res.redirect("/bookings");
};

exports.confirmPayment = async (req, res) => {
  await Booking.update(
    { paymentStatus: "PAID" },
    { where: { id: req.params.id } },
  );
  res.redirect("/bookings");
};
