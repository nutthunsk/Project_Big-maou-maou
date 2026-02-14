const { Booking, Concert, Customer } = require("../models");

const index = async (req, res) => {
  const bookings = await Booking.findAll({
    include: [Customer, Concert],
  });
  res.json(bookings);
};

const create = async (req, res) => {
  const { fullname, email, quantity, concertId } = req.body;

  const concert = await Concert.findByPk(concertId);
  if (!concert) return res.status(404).send("Concert not found");

  let customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    customer = await Customer.create({ fullname, email });
  }

  const totalPrice = concert.price * quantity;

  await Booking.create({
    quantity,
    totalPrice,
    status: "pending",
    CustomerId: customer.id,
    ConcertId: concert.id,
  });

  res.redirect("/bookings");
};

const pay = async (req, res) => {
  await Booking.update(
    { status: "paid" },
    { where: { id: req.params.id } }
  );
  res.json({ message: "Payment confirmed" });
};

module.exports = {
  index,
  create,
  pay,
};