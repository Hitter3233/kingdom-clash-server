window.Multiplayer = (() => {
  let socket = null;
  let roomCode = null;
  let role = null;

  const $ = (id) => document.getElementById(id);

  function connect(serverUrl) {
    return new Promise((resolve, reject) => {
      socket = new WebSocket(serverUrl);

      socket.addEventListener("open", () => {
        setStatus("Connected");
        resolve();
      });

      socket.addEventListener("message", (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === "room_created") {
          roomCode = msg.room;
          role = "host";
          showRoom(msg.room, "Waiting for another player...");
        }

        if (msg.type === "room_joined") {
          roomCode = msg.room;
          role = "guest";
          showRoom(msg.room, "Connected to the host.");
        }

        if (msg.type === "opponent_joined") {
          showRoom(msg.room, "Opponent connected!");
        }

        if (msg.type === "opponent_left") {
          showRoom(roomCode, "Opponent disconnected.");
        }

        // Battle messages will be handled here in the next multiplayer step.
        if (msg.type === "battle") {
          window.dispatchEvent(new CustomEvent("multiplayer-battle", { detail: msg }));
        }

        if (msg.type === "error") {
          setStatus(msg.message || "Server error");
        }
      });

      socket.addEventListener("close", () => setStatus("Disconnected"));
      socket.addEventListener("error", () => {
        setStatus("Connection failed");
        reject(new Error("WebSocket connection failed"));
      });
    });
  }

  function createRoom() {
    socket?.send(JSON.stringify({ type: "create_room" }));
  }

  function joinRoom(code) {
    socket?.send(JSON.stringify({ type: "join_room", room: code.trim().toUpperCase() }));
  }

  function sendBattle(action) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "battle", action }));
    }
  }

  function setStatus(text) {
    const el = $("mpStatus");
    if (el) el.textContent = text;
  }

  function showRoom(code, message) {
    const codeEl = $("roomCode");
    const messageEl = $("roomMessage");
    if (codeEl) codeEl.textContent = code;
    if (messageEl) messageEl.textContent = message;
  }

  return {
    connect,
    createRoom,
    joinRoom,
    sendBattle,
    getRoom: () => roomCode,
    getRole: () => role
  };
})();
