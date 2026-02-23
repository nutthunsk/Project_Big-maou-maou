const { Op } = require("sequelize");
const { Artist, Concert, Booking, Customer } = require("../models");

// GET /reports
// แสดงรายงานตามประเภทที่เลือก (concert / customer / artist)
exports.index = async (req, res) => {
  // อ่านประเภทของรายงานจาก query string
  const type = req.query.type || "concert";
  try {
    // REPORT: CONCERT SALES
    // รายงานยอดขายแยกตามคอนเสิร์ต
    if (type === "concert") {
      const status = req.query.status || "all";

      // เงื่อนไข include booking ตามสถานะ
      const bookingInclude =
        status === "all"
          ? { model: Booking, required: false }
          : { model: Booking, where: { status }, required: false };

      // ดึงข้อมูลคอนเสิร์ต พร้อมศิลปินและการจอง
      const concerts = await Concert.findAll({
        include: [
          { association: "Artists", through: { attributes: [] } },
          bookingInclude,
        ],
        order: [["ConcertDate", "ASC"]],
      });

      // คำนวณจำนวนบัตรและรายได้ต่อคอนเสิร์ต
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

      // สรุปภาพรวมทั้งหมด
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

    // REPORT: CUSTOMER SPENDING
    // รายงานยอดใช้จ่ายของลูกค้า
    if (type === "customer") {
      // ดึงข้อมูลลูกค้าพร้อม booking
      const customers = await Customer.findAll({
        include: [{ model: Booking }],
        order: [["fullname", "ASC"]],
      });

      // คำนวณยอดใช้จ่ายของลูกค้าแต่ละคน
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

      // สรุปรวมลูกค้าและรายได้ทั้งหมด
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

    // REPORT: ARTIST + BOOKING
    // รายงานศิลปิน คอนเสิร์ต และการจอง
    if (type === "artist") {
      // คำค้นหาชื่อศิลปิน
      const artistQuery = String(req.query.q || "").trim();

      // เงื่อนไขค้นหาศิลปินตามชื่อ
      const artistWhere = artistQuery
        ? { ArtistName: { [Op.like]: `${artistQuery}%` } }
        : undefined;

      // ดึงข้อมูลศิลปิน พร้อมคอนเสิร์ตและการจอง
      const artists = await Artist.findAll({
        where: artistWhere,
        include: [
          {
            association: "Concerts",
            through: { attributes: [] },
            include: [{ model: Booking, required: false }],
            required: false,
          },
        ],
        order: [["ArtistName", "ASC"]],
      });

      // คำนวณข้อมูลรายงานต่อศิลปิน
      const rows = artists.map((artist) => {
        const concerts = artist.Concerts || [];
        const bookings = concerts.flatMap((concert) => concert.Bookings || []);

        const bookingCount = bookings.length;
        const paidCount = bookings.filter(
          (booking) => booking.status === "paid",
        ).length;
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

      // สรุปภาพรวมรายงานศิลปินทั้งหมด
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
        artistQuery,
        rows,
        summary,
      });
    }
  } catch (err) {
    console.error("Report error:", err);
    return res.redirect("/?error=Report loading failed");
  }
};
