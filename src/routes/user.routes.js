const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");

router.get("/", controller.home);
router.get("/artist", (_req, res) => res.redirect("/user/artists"));
router.get("/artists", controller.artists);
router.get("/concert", (_req, res) => res.redirect("/user/concerts"));
router.get("/concerts", controller.concerts);

module.exports = router;