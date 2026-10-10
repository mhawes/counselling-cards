const ROOM_CODE_PATTERN = /^[A-Z]{5}$/;
const MAX_MESSAGE_SIZE = 65_536;

// Worker globals are isolate-local and may disappear at any time. This relay is
// best-effort only; separate isolates do not share room membership.
const rooms = new Map();

function removeSocket(roomCode, socket) {
  const room = rooms.get(roomCode);
  if (!room) {
    return;
  }

  room.delete(socket);
  if (room.size === 0) {
    rooms.delete(roomCode);
  }
}

function send(socket, message) {
  try {
    socket.send(JSON.stringify(message));
  } catch {
    socket.close(1011, "Signaling delivery failed.");
  }
}

export function handleSignalingMessage(socket, roomCode, event) {
  if (typeof event.data !== "string") {
    socket.close(1003, "Text signaling messages are required.");
    removeSocket(roomCode, socket);
    return;
  }
  if (event.data.length > MAX_MESSAGE_SIZE) {
    socket.close(1009, "Signaling message is too large.");
    removeSocket(roomCode, socket);
    return;
  }

  let message;
  try {
    message = JSON.parse(event.data);
  } catch {
    socket.close(1003, "Invalid signaling message.");
    removeSocket(roomCode, socket);
    return;
  }

  if (!message || typeof message !== "object") {
    socket.close(1003, "Invalid signaling message.");
    removeSocket(roomCode, socket);
    return;
  }

  switch (message.type) {
    case "subscribe": {
      if (
        !Array.isArray(message.topics) ||
        !message.topics.includes(roomCode)
      ) {
        return;
      }

      let room = rooms.get(roomCode);
      if (!room) {
        room = new Set();
        rooms.set(roomCode, room);
      }
      room.add(socket);
      break;
    }
    case "unsubscribe": {
      if (Array.isArray(message.topics) && message.topics.includes(roomCode)) {
        removeSocket(roomCode, socket);
      }
      break;
    }
    case "publish": {
      if (
        message.topic !== roomCode ||
        typeof message.data === "undefined" ||
        !rooms.get(roomCode)?.has(socket)
      ) {
        return;
      }

      const room = rooms.get(roomCode);
      const outgoing = {
        ...message,
        clients: room.size
      };
      for (const client of room) {
        send(client, outgoing);
      }
      break;
    }
    case "ping":
      send(socket, { type: "pong" });
      break;
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response("ok");
    }

    const roomCode = url.pathname.slice(1);
    if (!ROOM_CODE_PATTERN.test(roomCode)) {
      return new Response("Invalid room code.", { status: 404 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required.", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.addEventListener("message", event =>
      handleSignalingMessage(server, roomCode, event)
    );
    server.addEventListener("close", () => removeSocket(roomCode, server));
    server.addEventListener("error", () => removeSocket(roomCode, server));

    return new Response(null, { status: 101, webSocket: client });
  }
};
