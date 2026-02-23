const { Customer } = require("../models");

// Cookie / Authentication Utils
// ชื่อ cookie ที่ใช้เก็บ customer id
const COOKIE_NAME = "user_customer_id";

// แปลง cookie string จาก header เป็น object
const parseCookies = (cookieHeader = "") =>
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [key, ...valueParts] = part.split("=");
      if (!key) return acc;
      acc[key] = decodeURIComponent(valueParts.join("="));
      return acc;
    }, {});

// ดึง customerId จาก cookie ใน request
const extractCustomerIdFromReq = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const customerId = Number(cookies[COOKIE_NAME] || 0);
  // คืนค่า id ที่ถูกต้องเท่านั้น
  return Number.isInteger(customerId) && customerId > 0 ? customerId : null;
};

// ดึงข้อมูลลูกค้าที่ล็อกอินอยู่จาก request
const getAuthCustomer = async (req) => {
  const customerId = extractCustomerIdFromReq(req);
  if (!customerId) return null;
  return Customer.findByPk(customerId);
};

// สร้าง cookie สำหรับเข้าสู่ระบบ
const setAuthCookie = (res, customerId) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(customerId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  );
};

// ลบ cookie เมื่อออกจากระบบ
const clearAuthCookie = (res) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
};

// Middleware ตรวจสอบว่าผู้ใช้ล็อกอินแล้วหรือไม่
const requireUserLogin = async (req, res, next) => {
  try {
    const authCustomer = await getAuthCustomer(req);
    // ถ้ายังไม่ล็อกอิน ให้ redirect ไปหน้า login
    if (!authCustomer) {
      const target = encodeURIComponent(req.originalUrl || "/user/concerts");
      return res.redirect(
        `/user/login?redirect=${target}&error=${encodeURIComponent("Please log in before booking tickets")}`,
      );
    }

    // เก็บข้อมูลผู้ใช้ไว้ใน request
    req.authCustomer = authCustomer;
    return next();
  } catch (error) {
    console.error("User auth middleware error:", error);
    return res.redirect(
      `/user/login?error=${encodeURIComponent("An error occurred during identity verification")}`,
    );
  }
};

// export ฟังก์ชันที่ใช้เกี่ยวกับ authentication
module.exports = {
  COOKIE_NAME,
  getAuthCustomer,
  setAuthCookie,
  clearAuthCookie,
  requireUserLogin,
};
