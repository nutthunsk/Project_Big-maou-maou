const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 5);
};

const buildTicketText = ({ booking, concert, customer }) => {
  return [
    "=== E-TICKET / ใบยืนยันการจองคอนเสิร์ต ===",
    `Booking ID: ${booking.id}`,
    `ชื่อผู้จอง: ${customer.fullname}`,
    `อีเมล: ${customer.email}`,
    `คอนเสิร์ต: ${concert.ConcertName}`,
    `สถานที่: ${concert.venue || "-"}`,
    `วันที่แสดง: ${formatDate(concert.ConcertDate)}`,
    `เวลาแสดง: ${formatTime(concert.ConcertTime)}`,
    `จำนวนบัตร: ${booking.quantity}`,
    `ยอดชำระ: ${Number(booking.totalPrice || 0).toLocaleString()} บาท`,
    `สถานะ: ${booking.status}`,
    "",
    "กรุณานำอีเมลฉบับนี้มาแสดงเพื่อยืนยันการเข้าชมงาน",
  ].join("\n");
};

const sendBookingTicketEmail = async ({ booking, concert, customer }) => {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  const mailFrom = String(process.env.BOOKING_MAIL_FROM || "").trim();

  if (!resendApiKey || !mailFrom) {
    return {
      sent: false,
      reason:
        "RESEND_API_KEY or BOOKING_MAIL_FROM is not configured. Skip sending email.",
    };
  }

  const ticketText = buildTicketText({ booking, concert, customer });
  const subject = `E-Ticket #${booking.id} สำหรับ ${concert.ConcertName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111">
      <h2>ยืนยันการจองคอนเสิร์ตสำเร็จ</h2>
      <p>สวัสดีคุณ <strong>${customer.fullname}</strong></p>
      <p>ระบบได้รับการจองบัตรเรียบร้อยแล้ว โดยมีรายละเอียดดังนี้:</p>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.id}</li>
        <li><strong>คอนเสิร์ต:</strong> ${concert.ConcertName}</li>
        <li><strong>วันที่:</strong> ${formatDate(concert.ConcertDate)}</li>
        <li><strong>เวลา:</strong> ${formatTime(concert.ConcertTime)}</li>
        <li><strong>สถานที่:</strong> ${concert.venue || "-"}</li>
        <li><strong>จำนวนบัตร:</strong> ${booking.quantity}</li>
        <li><strong>ยอดชำระ:</strong> ${Number(booking.totalPrice || 0).toLocaleString()} บาท</li>
        <li><strong>สถานะ:</strong> ${booking.status}</li>
      </ul>
      <p>แนบไฟล์บัตรอิเล็กทรอนิกส์ (E-Ticket) มาพร้อมอีเมลฉบับนี้แล้ว</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [customer.email],
      subject,
      html,
      attachments: [
        {
          filename: `e-ticket-booking-${booking.id}.txt`,
          content: Buffer.from(ticketText, "utf8").toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Send email failed (${response.status}): ${body}`);
  }

  return { sent: true };
};

module.exports = {
  sendBookingTicketEmail,
};