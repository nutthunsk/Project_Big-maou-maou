const { Customer, Booking, Concert } = require("../models");

const PHONE_REGEX = /^[0-9]{8,15}$/;

const enrichCustomers = (customers) => {
  return customers.map((customer) => {
    const bookings = customer.Bookings || [];
    const totalBookings = bookings.length;
    const paidBookings = bookings.filter((b) => b.status === "paid").length;
    const pendingBookings = bookings.filter((b) => b.status === "pending").length;
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
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
      pendingBookings,
      cancelledBookings,
      totalSpent,
      lastBookingDate,
      paymentSummary:
        totalBookings === 0
          ? "-"
          : `ชำระแล้ว ${paidBookings} | รอชำระ ${pendingBookings} | ยกเลิก ${cancelledBookings}`,
    };
  });
};

// GET /customers
exports.index = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      include: [
        {
          model: Booking,
          include: [Concert],
          order: [["id", "DESC"]],
        },
      ],
      order: [["id", "ASC"]],
    });

  const customerRows = enrichCustomers(customers);
    return res.render("customers/index", { customerRows });
  } catch (err) {
    console.error("Customer index error:", err);
    return res.status(500).send("ไม่สามารถโหลดข้อมูลลูกค้าธุรกิจได้");
  }
};

// GET /customers/report
exports.report = async (req, res) => {
  try {
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

  return res.render("customers/report", { customerRows, totals });
  } catch (err) {
    console.error("Customer report error:", err);
    return res.status(500).send("ไม่สามารถโหลดรายงานลูกค้าได้");
  }
};

// GET /customers
exports.api = async (req, res) => {
  try {
    const customers = await Customer.findAll({ order: [["id", "ASC"]] });
    return res.json(customers);
  } catch (err) {
    console.error("Customer api error:", err);
    return res.status(500).json({ message: "ไม่สามารถโหลดข้อมูลลูกค้าได้" });
  }
};

// POST /customers
exports.create = async (req, res) => {
  try {
    const { fullname, email, phoneNumber } = req.body;

    if (!PHONE_REGEX.test(String(phoneNumber || ""))) {
      return res.status(400).send("เบอร์โทรต้องเป็นตัวเลข 8-15 หลัก");
    }

    await Customer.create({ fullname, email, phoneNumber });

    if (req.headers["content-type"]?.includes("application/json")) {
      return res.json({ message: "Customer created" });
    }

    return res.redirect("/customers");
  } catch (err) {
    console.error("Customer create error:", err);
    return res.status(500).send("ไม่สามารถสร้างข้อมูลลูกค้าได้");
  }
  };

// POST /customers/:id/delete
exports.delete = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

  if (!customer) {
      return res.status(404).send("ไม่พบข้อมูลลูกค้า");
    }

    await Booking.destroy({ where: { CustomerId: customer.id } });
    await customer.destroy();

    return res.redirect("/customers");
  } catch (err) {
    console.error("Customer delete error:", err);
    return res.status(500).send("ไม่สามารถลบข้อมูลลูกค้าได้");
  }
};
