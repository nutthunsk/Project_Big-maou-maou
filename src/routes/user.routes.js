const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");
const { requireUserLogin } = require("../utils/user-auth");

router.get("/", controller.home);
router.get("/artist", (_req, res) => res.redirect("/user/artists"));
router.get("/artists", controller.artists);
router.get("/concert", (_req, res) => res.redirect("/user/concerts"));
router.get("/concerts", controller.concerts);
router.get("/login", controller.loginForm);
router.post("/login", controller.login);
router.post("/logout", controller.logout);
router.get("/profile", requireUserLogin, controller.profile);
router.post("/profile", requireUserLogin, controller.updateProfile);

module.exports = router;