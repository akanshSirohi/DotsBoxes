const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/game", (req, res) => {
  if (req.query.code == null) {
    let secret = "";
    if (req.query.secret != null) {
      secret = req.query.secret;
    }
    res.render("game", {
      type: "host",
      code: "",
      secret: secret,
      size: req.query.size,
    });
  } else {
    res.render("game", {
      type: "client",
      code: req.query.code,
      secret: "",
      size: "-1",
    });
  }
});

module.exports = router;
