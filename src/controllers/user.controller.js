const { Artist, Concert, Booking } = require("../models");

const attachSeatStats = async (concerts) => {
  const concertRows = Array.isArray(concerts) ? concerts : [];
  if (!concertRows.length) return [];

  const concertIds = concertRows.map((concert) => concert.id);
  const bookings = await Booking.findAll({
    where: { ConcertId: concertIds },
    attributes: ["ConcertId", "quantity", "status"],
  });

  const bookedByConcertId = bookings.reduce((acc, booking) => {
    if (booking.status === "cancelled") return acc;
    const concertId = Number(booking.ConcertId);
    acc[concertId] = (acc[concertId] || 0) + Number(booking.quantity || 0);
    return acc;
  }, {});

  return concertRows.map((concert) => {
    const c = concert.toJSON();
    const totalSeats = Number(c.totalSeats || 0);
    const bookedSeats = Number(bookedByConcertId[c.id] || 0);

    return {
      ...c,
      seatStats: {
        totalSeats,
        bookedSeats,
        remainingSeats: Math.max(totalSeats - bookedSeats, 0),
      },
    };
  });
};

exports.home = async (_req, res) => {
  try {
    const [latestArtists, latestConcerts] = await Promise.all([
      Artist.findAll({
        include: [{ association: "Concerts", through: { attributes: [] } }],
        order: [["id", "DESC"]],
        limit: 6,
      }),
      Concert.findAll({
        include: [{ association: "Artists", through: { attributes: [] } }],
        order: [["ConcertDate", "ASC"], ["id", "ASC"]],
        limit: 6,
      }),
    ]);

    res.render("user/home", { latestArtists, latestConcerts });
  } catch (err) {
    console.error("User home error:", err);
    res.render("user/home", { latestArtists: [], latestConcerts: [] });
  }
};

exports.artists = async (_req, res) => {
  try {
    const artists = await Artist.findAll({
      include: [{ association: "Concerts", through: { attributes: [] } }],
      order: [["id", "ASC"]],
    });

    res.render("user/artists", { artists });
  } catch (err) {
    console.error("User artists error:", err);
    res.redirect("/user?error=ไม่สามารถโหลดข้อมูลศิลปินได้");
  }
};

exports.concerts = async (_req, res) => {
  try {
    const concerts = await Concert.findAll({
      include: [{ association: "Artists", through: { attributes: [] } }],
      order: [["ConcertDate", "ASC"]],
    });

    const concertsWithSeatStats = await attachSeatStats(concerts);
    res.render("user/concerts", { concerts: concertsWithSeatStats });
  } catch (err) {
    console.error("User concerts error:", err);
    res.redirect("/user?error=ไม่สามารถโหลดข้อมูลคอนเสิร์ตได้");
  }
};