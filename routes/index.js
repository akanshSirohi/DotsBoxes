const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  let hostname = req.hostname;
  if(hostname == "localhost") {
    global.baseurl = `http://localhost:${port}`;
  }else{
    global.baseurl = `https://${hostname}`;
  }
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
