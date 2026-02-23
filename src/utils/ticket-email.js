const https = require("https");

const RESEND_API_ENDPOINT = "https://api.resend.com/emails";

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

const postResendEmail = (payload, resendApiKey) =>
  new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(payload);
    const request = https.request(
      RESEND_API_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
        },
        timeout: 15_000,
      },
      (response) => {
        let rawData = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          rawData += chunk;
        });

        response.on("end", () => {
          const status = Number(response.statusCode || 500);
          if (status >= 200 && status < 300) {
            resolve({ ok: true, status, body: rawData });
            return;
          }

          resolve({ ok: false, status, body: rawData });
        });
      },
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.on("timeout", () => {
      request.destroy(new Error("Request to Resend API timed out"));
    });

    request.write(requestBody);
    request.end();
  });

const sendBookingTicketEmail = async ({ booking, concert, customer }) => {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  const configuredMailFrom = String(process.env.BOOKING_MAIL_FROM || "").trim();
  const isProduction = String(process.env.NODE_ENV || "").trim() === "production";
  const fallbackMailFrom = "Concert App <onboarding@resend.dev>";
  const mailFrom = configuredMailFrom || (!isProduction ? fallbackMailFrom : "");

  if (!resendApiKey) {
    return {
      sent: false,
      reason: "ยังไม่ได้ตั้งค่า RESEND_API_KEY",
    };
  }

  if (!mailFrom) {
    return {
      sent: false,
      reason:
        "ยังไม่ได้ตั้งค่า BOOKING_MAIL_FROM (production ต้องใช้ผู้ส่งที่ยืนยันโดเมนแล้วใน Resend)",
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

  const response = await postResendEmail(
    {
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
    },
    resendApiKey,
  );

  if (!response.ok) {
    throw new Error(`Send email failed (${response.status}): ${response.body}`);
  }
  return {
    sent: true,
    usingFallbackSender: !configuredMailFrom && mailFrom === fallbackMailFrom,
  };
};

module.exports = {
  sendBookingTicketEmail,
};