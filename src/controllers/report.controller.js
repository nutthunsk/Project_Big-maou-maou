const { Concert, Booking, Customer } = require("../models");

exports.concertSales = async (req, res) => {
  try {
    const status = req.query.status || "all";
    const where = status === "all" ? undefined : { status };

    const concerts = await Concert.findAll({
      include: [
        { association: "Artists", through: { attributes: [] } },
        { model: Booking, where, required: false, include: [Customer] },
      ],
      order: [["ConcertDate", "ASC"]],
    });

    const rows = concerts.map((concert) => {
      const bookings = concert.Bookings || [];
      const totalQty = bookings.reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);
      const totalRevenue = bookings.reduce(
        (sum, booking) => sum + Number(booking.totalPrice || 0),
        0,
      );

      return { concert, totalQty, totalRevenue };
    });

    const summary = rows.reduce(
      (acc, row) => {
        acc.totalConcerts += 1;
        acc.totalTickets += row.totalQty;
        acc.totalRevenue += row.totalRevenue;
        return acc;
      },
      { totalConcerts: 0, totalTickets: 0, totalRevenue: 0 },
    );

    return res.render("reports/concert-sales", { rows, status, summary });
  } catch (err) {
    console.error("Report concert sales error:", err);
    return res.redirect("/?error=ไม่สามารถโหลดรายงานยอดขายคอนเสิร์ตได้");
  }
};

exports.customerSpending = async (req, res) => {
  try {
    const minSpent = Number(req.query.minSpent || 0);

    const customers = await Customer.findAll({
      include: [{ model: Booking, include: [Concert] }],
      order: [["fullname", "ASC"]],
    });

    const rows = customers
      .map((customer) => {
        const bookings = customer.Bookings || [];
        const totalSpent = bookings.reduce((sum, booking) => {
          if (booking.status === "cancelled") return sum;
          return sum + Number(booking.totalPrice || 0);
        }, 0);

        return {
          customer,
          bookings: bookings.length,
          totalSpent,
        };
      })
      .filter((row) => row.totalSpent >= minSpent);

    const summary = rows.reduce(
      (acc, row) => {
        acc.customerCount += 1;
        acc.bookingCount += row.bookings;
        acc.revenue += row.totalSpent;
        return acc;
      },
      { customerCount: 0, bookingCount: 0, revenue: 0 },
    );

    return res.render("reports/customer-spending", { rows, minSpent, summary });
  } catch (err) {
    console.error("Report customer spending error:", err);
    return res.redirect("/?error=ไม่สามารถโหลดรายงานการใช้จ่ายลูกค้าได้");
  }
};