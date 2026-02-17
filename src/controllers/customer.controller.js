const { Customer, Booking, Concert } = require("../models");

const enrichCustomers = (customers) => {
  return customers.map((customer) => {
    const bookings = customer.Bookings || [];
    const totalBookings = bookings.length;
    const paidBookings = bookings.filter((b) => b.status === "paid").length;
    const totalSpent = bookings
      .filter((b) => b.status === "paid")
      .reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

    const lastBookingDate = bookings.length
      ? bookings
          .map((b) => new Date(b.bookingDate || b.createdAt || 0))
          .sort((a, b) => b - a)[0]
      : null;

    return {
      customer,
      bookings,
      totalBookings,
      paidBookings,
      totalSpent,
      lastBookingDate,
    };
  });
};

// GET /customers
exports.index = async (req, res) => {
  const customers = await Customer.findAll({
    include: [
      {
        model: Booking,
        include: [Concert],
      },
    ],
    order: [["id", "ASC"]],
  });

  const customerRows = enrichCustomers(customers);

  res.render("customers/index", { customerRows });
};

// GET /customers/report
exports.report = async (req, res) => {
  const customers = await Customer.findAll({
    include: [
      {
        model: Booking,
        include: [Concert],
      },
    ],
  });

  const customerRows = enrichCustomers(customers).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );

  const totals = customerRows.reduce(
    (acc, row) => {
      acc.customers += 1;
      acc.bookings += row.totalBookings;
      acc.paidBookings += row.paidBookings;
      acc.revenue += row.totalSpent;
      return acc;
    },
    { customers: 0, bookings: 0, paidBookings: 0, revenue: 0 }
  );

  res.render("customers/report", { customerRows, totals });
};

// GET /customers/api
exports.api = async (req, res) => {
  const customers = await Customer.findAll({ order: [["id", "ASC"]] });
  res.json(customers);
};

// POST /customers
exports.create = async (req, res) => {
  await Customer.create({
    fullname: req.body.fullname,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
  });
  if (req.headers["content-type"]?.includes("application/json")) {
    return res.json({ message: "Customer created" });
  }

  return res.redirect("/customers");
};
