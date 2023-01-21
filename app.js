const express = require("express");
const expressLayouts = require("express-ejs-layouts");
var fs = require("fs");
const app = express();
app.use(expressLayouts);
app.set("view engine", "ejs");
app.use(express.static("public"));
const port = process.env.PORT || 3000;
global.port = port;
app.use("/", require("./routes/index"));
const cors = require("cors");
app.use(cors());

let gameCodes = [];
let gameSockets = [];

const genUniqueCode = () => {
  let x = Math.random().toString(36).slice(6);
  x = "a" + x.toLowerCase().slice(0, 6);
  if (gameCodes.includes(x)) {
    return genUniqueCode();
  } else {
    return x;
  }
};

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

const socket = require("socket.io");
const io = socket(server, { cors: { origin: "*" } });

const initListenes = (soc) => {
  soc.on("disconnect", () => {
    gameSockets.forEach((s, i) => {
      if (s[Object.keys(s)].host == soc) {
        if (s[Object.keys(s)].client != null) {
          s[Object.keys(s)].client.emit("exit", "");
        }
        gameSockets.splice(i, 1);
        gameCodes.splice(i, 1);
      } else if (s[Object.keys(s)].client == soc) {
        s[Object.keys(s)].host.emit("pause", "");
        s[Object.keys(s)].client = null;
      }
    });
  });

  soc.on("reqCode", (data) => {
    let code = "";
    let pin = data.pin;
    if (pin.length == 0) {
      code = genUniqueCode();
    } else {
      let flg = true;
      let config = fs.readFileSync("config.json", "utf8");
      let g_codes = JSON.parse(config);
      for(const gcode in g_codes) {
        if(gcode === pin && !gameCodes.includes(g_codes[gcode])) {
          code = g_codes[gcode];
          flg = false;
          break;
        }
      }
      if (flg) {
        code = genUniqueCode();
      }
    }
    let socObj = {};
    socObj[code] = {
      host: soc,
      client: null,
      gStarted: false,
      size: eval(data.size),
    };
    gameSockets.push(socObj);
    gameCodes.push(code);
    soc.emit("gameCode", code);
  });

  soc.on("connectClient", (code) => {
    if (gameCodes.includes(code)) {
      let i = gameCodes.indexOf(code);
      if (i >= 0) {
        if (gameSockets[i][code].client == null) {
          gameSockets[i][code].client = soc;
          soc.emit("clientConnected", {
            flg: true,
            size: gameSockets[i][code].size,
          });
          if (!gameSockets[i][code].gStarted) {
            gameSockets[i][code].host.emit("partnerConnected", "ok");
            gameSockets[i][code].gStarted = true;
          } else {
            gameSockets[i][code].host.emit("partnerReConnected", "ok");
          }
          console.log(gameSockets[i]);
        } else {
          soc.emit("clientConnected", { flg: false });
        }
      } else {
        soc.emit("clientConnected", { flg: false });
      }
    } else {
      soc.emit("clientConnected", "false");
      console.log("Game code not found on server!");
    }
  });

  soc.on("setName", (data) => {
    let i = gameCodes.indexOf(data.code);
    if (i >= 0) {
      if (data.type == "host") {
        if (gameSockets[i][data.code].client != null) {
          gameSockets[i][data.code].client.emit("getName", data.name);
        }
      } else {
        if (gameSockets[i][data.code].host != null) {
          gameSockets[i][data.code].host.emit("getName", data.name);
        }
      }
    }
  });

  soc.on("sendLine", (data) => {
    let i = gameCodes.indexOf(data.code);
    if (i >= 0) {
      let obj = {
        id: data.id,
        grp: data.grp,
        chance: data.chance,
      };
      if (data.type == "host") {
        if (gameSockets[i][data.code].client != null) {
          gameSockets[i][data.code].client.emit("getLine", obj);
        }
      } else {
        if (gameSockets[i][data.code].host != null) {
          gameSockets[i][data.code].host.emit("getLine", obj);
        }
      }
    }
  });

  soc.on("askRestart", (data) => {
    let i = gameCodes.indexOf(data.code);
    if (i >= 0) {
      if (gameSockets[i][data.code].client != null) {
        gameSockets[i][data.code].client.emit("askedRestart", "true");
      }
    }
  });

  soc.on("sendMessage", (data) => {
    let i = gameCodes.indexOf(data.code);
    if (i >= 0) {
      if (data.type == "host") {
        if (gameSockets[i][data.code].client != null) {
          gameSockets[i][data.code].client.emit("msgReceived", data.msg);
        }
      } else {
        if (gameSockets[i][data.code].host != null) {
          gameSockets[i][data.code].host.emit("msgReceived", data.msg);
        }
      }
    }
  });

  soc.on("sendVibe", (data) => {
    let i = gameCodes.indexOf(data.code);
    if (i >= 0) {
      if (data.type == "host") {
        if (gameSockets[i][data.code].client != null) {
          gameSockets[i][data.code].client.emit("gotVibe", "");
        }
      } else {
        if (gameSockets[i][data.code].host != null) {
          gameSockets[i][data.code].host.emit("gotVibe", "");
        }
      }
    }
  });

  soc.on("sendReact", (data) => {
    let i = gameCodes.indexOf(data.code);
    if (i >= 0) {
      if (data.type == "host") {
        if (gameSockets[i][data.code].client != null) {
          gameSockets[i][data.code].client.emit("gotReact", data.r);
        }
      } else {
        if (gameSockets[i][data.code].host != null) {
          gameSockets[i][data.code].host.emit("gotReact", data.r);
        }
      }
    }
  });
};

io.sockets.on("connection", (soc) => {
  initListenes(soc);
});
