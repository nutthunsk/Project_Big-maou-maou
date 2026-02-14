const { Customer } = require("../models");

// GET /customers
exports.index = async (req, res) => {
  const customers = await Customer.findAll();
  res.json(customers);
};

// POST /customers
exports.create = async (req, res) => {
  await Customer.create({
    fullname: req.body.fullname,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
  });
  res.json({ message: "Customer created" });
};
