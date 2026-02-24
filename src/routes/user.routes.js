const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");
const { requireUserLogin } = require("../utils/user-auth");

// User Routes (Frontend)

// หน้าแรกฝั่งผู้ใช้
router.get("/", controller.home);

// redirect ไปหน้ารายชื่อศิลปิน
router.get("/artist", (_req, res) => res.redirect("/user/artists"));

// แสดงรายชื่อศิลปินทั้งหมด
router.get("/artists", controller.artists);

// redirect ไปหน้ารายการคอนเสิร์ต
router.get("/concert", (_req, res) => res.redirect("/user/concerts"));

// แสดงคอนเสิร์ตทั้งหมด (พร้อมข้อมูลที่นั่ง)
router.get("/concerts", controller.concerts);

// แสดงฟอร์มเข้าสู่ระบบผู้ใช้
router.get("/login", controller.loginForm);

// เข้าสู่ระบบผู้ใช้ (สร้าง session / cookie)
router.post("/login", controller.login);

// แสดงฟอร์มสมัครสมาชิกผู้ใช้
router.get("/register", controller.registerForm);

// สมัครสมาชิกผู้ใช้ใหม่
router.post("/register", controller.register);

// แสดงฟอร์มลืมรหัสผ่าน
router.get("/forgot-password", controller.forgotPasswordForm);

// รีเซ็ตรหัสผ่านผู้ใช้
router.post("/forgot-password", controller.forgotPassword);

// ออกจากระบบผู้ใช้
router.post("/logout", controller.logout);

// แสดงโปรไฟล์ผู้ใช้ (ต้องล็อกอินก่อน)
router.get("/profile", requireUserLogin, controller.profile);

// อัปเดตข้อมูลโปรไฟล์ผู้ใช้ (ต้องล็อกอินก่อน)
router.post("/profile", requireUserLogin, controller.updateProfile);

// แสดงใบจองของผู้ใช้ (ต้องล็อกอินก่อน)
router.get(
  "/bookings/:id/receipt",
  requireUserLogin,
  controller.bookingReceipt,
);

module.exports = router;
