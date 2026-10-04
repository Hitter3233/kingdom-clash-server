const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const rooms = new Map();

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ok: true, rooms: rooms.size}));
    return;
  }
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end("Kingdom Clash multiplayer server is running.");
});

const wss = new WebSocket.Server({ server });

function send(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function leaveRoom(ws) {
  if (!ws.room) return;
  const room = rooms.get(ws.room);
  if (!room) return;

  room.players = room.players.filter(p => p !== ws);
  for (const player of room.players) {
    send(player, {type: "opponent_left", room: ws.room});
  }

  if (room.players.length === 0) rooms.delete(ws.room);
  ws.room = null;
}

wss.on("connection", (ws) => {
  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return send(ws, {type:"error", message:"Invalid message."}); }

    if (msg.type === "create_room") {
      leaveRoom(ws);

      const code = makeRoomCode();
      rooms.set(code, {players:[ws]});
      ws.room = code;
      ws.role = "host";

      send(ws, {type:"room_created", room:code});
      return;
    }

    if (msg.type === "join_room") {
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) return send(ws, {type:"error", message:"Room not found."});
      if (room.players.length >= 2) return send(ws, {type:"error", message:"Room is full."});

      leaveRoom(ws);
      room.players.push(ws);
      ws.room = code;
      ws.role = "guest";

      send(ws, {type:"room_joined", room:code});
      send(room.players[0], {type:"opponent_joined", room:code});
      return;
    }

    if (msg.type === "battle") {
      const room = rooms.get(ws.room);
      if (!room) return send(ws, {type:"error", message:"You are not in a room."});

      // For now this is a relay. The next step will make the server authoritative.
      for (const player of room.players) {
        if (player !== ws) {
          send(player, {
            type:"battle",
            from: ws.role,
            action: msg.action
          });
        }
      }
    }
  });

  ws.on("close", () => leaveRoom(ws));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Kingdom Clash server listening on port ${PORT}`);
});
