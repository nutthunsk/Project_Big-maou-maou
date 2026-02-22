const { Customer } = require("../models");

const COOKIE_NAME = "user_customer_id";

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

const extractCustomerIdFromReq = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const customerId = Number(cookies[COOKIE_NAME] || 0);
  return Number.isInteger(customerId) && customerId > 0 ? customerId : null;
};

const getAuthCustomer = async (req) => {
  const customerId = extractCustomerIdFromReq(req);
  if (!customerId) return null;
  return Customer.findByPk(customerId);
};

const setAuthCookie = (res, customerId) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(customerId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  );
};

const clearAuthCookie = (res) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
};

const requireUserLogin = async (req, res, next) => {
  try {
    const authCustomer = await getAuthCustomer(req);
    if (!authCustomer) {
      const target = encodeURIComponent(req.originalUrl || "/user/concerts");
      return res.redirect(
        `/user/login?redirect=${target}&error=${encodeURIComponent("กรุณาเข้าสู่ระบบก่อนจองบัตร")}`,
      );
    }

    req.authCustomer = authCustomer;
    return next();
  } catch (error) {
    console.error("User auth middleware error:", error);
    return res.redirect(
      `/user/login?error=${encodeURIComponent("เกิดข้อผิดพลาดในการยืนยันตัวตน")}`,
    );
  }
};

module.exports = {
  COOKIE_NAME,
  getAuthCustomer,
  setAuthCookie,
  clearAuthCookie,
  requireUserLogin,
};
