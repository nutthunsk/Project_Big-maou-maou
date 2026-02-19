const { Artist, Concert, Booking, Customer } = require("../models");

exports.index = async (req, res) => {
    const type = req.query.type || "concert"; // concert | customer | artist

  try {
    // =========================
    // REPORT: CONCERT SALES
    // =========================
    if (type === "concert") {
      const status = req.query.status || "all";

      const bookingInclude =
        status === "all"
          ? { model: Booking, required: false }
          : { model: Booking, where: { status }, required: false };

      const concerts = await Concert.findAll({
        include: [
          { association: "Artists", through: { attributes: [] } },
          bookingInclude,
        ],
        order: [["ConcertDate", "ASC"]],
      });

      const rows = concerts.map((concert) => {
        const bookings = concert.Bookings || [];
        const totalQty = bookings.reduce(
          (s, b) => s + Number(b.quantity || 0),
          0,
        );
        const totalRevenue = bookings.reduce(
          (s, b) => s + Number(b.totalPrice || 0),
          0,
        );

        return { concert, totalQty, totalRevenue };
      });

      const summary = rows.reduce(
        (a, r) => {
          a.totalConcerts++;
          a.totalTickets += r.totalQty;
          a.totalRevenue += r.totalRevenue;
          return a;
        },
        { totalConcerts: 0, totalTickets: 0, totalRevenue: 0 },
      );

      return res.render("reports/index", {
        type,
        status,
        rows,
        summary,
      });
    }

    // =========================
    // REPORT: CUSTOMER SPENDING
    // =========================
    if (type === "customer") {
      const customers = await Customer.findAll({
        include: [{ model: Booking }],
        order: [["fullname", "ASC"]],
      });

      const rows = customers.map((customer) => {
        const bookings = customer.Bookings || [];
        const totalSpent = bookings.reduce((sum, b) => {
          if (b.status === "cancelled") return sum;
          return sum + Number(b.totalPrice || 0);
        }, 0);

        return {
          customer,
          bookings: bookings.length,
          totalSpent,
        };
      });

      const summary = rows.reduce(
        (a, r) => {
          a.customerCount++;
          a.bookingCount += r.bookings;
          a.revenue += r.totalSpent;
          return a;
        },
        { customerCount: 0, bookingCount: 0, revenue: 0 },
      );

      return res.render("reports/index", {
        type,
        rows,
        summary,
      });
    }

        // =========================
    // REPORT: ARTIST + BOOKING
    // =========================
    if (type === "artist") {
      const artists = await Artist.findAll({
        include: [
          {
            model: Concert,
            as: "PrimaryConcerts",
            include: [{ model: Booking, required: false }],
            required: false,
          },
        ],
        order: [["ArtistName", "ASC"]],
      });

      const rows = artists.map((artist) => {
        const concerts = artist.PrimaryConcerts || [];
        const bookings = concerts.flatMap((concert) => concert.Bookings || []);

        const bookingCount = bookings.length;
        const paidCount = bookings.filter((booking) => booking.status === "paid").length;
        const revenue = bookings.reduce((sum, booking) => {
          if (booking.status === "cancelled") return sum;
          return sum + Number(booking.totalPrice || 0);
        }, 0);

        return {
          artist,
          concertCount: concerts.length,
          bookingCount,
          paidCount,
          revenue,
        };
      });

      const summary = rows.reduce(
        (acc, row) => {
          acc.artistCount += 1;
          acc.concertCount += row.concertCount;
          acc.bookingCount += row.bookingCount;
          acc.revenue += row.revenue;
          return acc;
        },
        { artistCount: 0, concertCount: 0, bookingCount: 0, revenue: 0 },
      );

      return res.render("reports/index", {
        type,
        rows,
        summary,
      });
    }
    
  } catch (err) {
    console.error("Report error:", err);
    return res.redirect("/?error=โหลดรายงานไม่สำเร็จ");
  }
};
