const ROOM_CODE_PATTERN = /^[A-Z]{5}$/;
const MAX_MESSAGE_SIZE = 65_536;

// Worker globals are isolate-local and may disappear at any time. This relay is
// best-effort only; separate isolates do not share room membership.
const rooms = new Map();

function log(level, event, details = {}) {
  console[level](
    JSON.stringify({
      component: "yjs-signaling",
      event,
      timestamp: new Date().toISOString(),
      ...details
    })
  );
}

function removeSocket(roomCode, socket) {
  const room = rooms.get(roomCode);
  if (!room) {
    return;
  }

  const removed = room.delete(socket);
  if (removed) {
    log("info", "socket-unsubscribed", { roomCode, roomSize: room.size });
  }
  if (room.size === 0) {
    rooms.delete(roomCode);
  }
}

function send(socket, message, roomCode) {
  try {
    socket.send(JSON.stringify(message));
  } catch {
    log("error", "socket-send-failed", { roomCode, messageType: message.type });
    socket.close(1011, "Signaling delivery failed.");
    removeSocket(roomCode, socket);
  }
}

export function handleSignalingMessage(socket, roomCode, event) {
  if (typeof event.data !== "string") {
    log("warn", "invalid-message-type", { roomCode });
    socket.close(1003, "Text signaling messages are required.");
    removeSocket(roomCode, socket);
    return;
  }
  if (event.data.length > MAX_MESSAGE_SIZE) {
    log("warn", "message-too-large", {
      roomCode,
      messageLength: event.data.length
    });
    socket.close(1009, "Signaling message is too large.");
    removeSocket(roomCode, socket);
    return;
  }

  let message;
  try {
    message = JSON.parse(event.data);
  } catch {
    log("warn", "invalid-json", { roomCode, messageLength: event.data.length });
    socket.close(1003, "Invalid signaling message.");
    removeSocket(roomCode, socket);
    return;
  }

  if (!message || typeof message !== "object") {
    log("warn", "invalid-message", { roomCode });
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
        log("warn", "subscribe-rejected", {
          roomCode,
          topics: Array.isArray(message.topics) ? message.topics : null
        });
        return;
      }

      let room = rooms.get(roomCode);
      if (!room) {
        room = new Set();
        rooms.set(roomCode, room);
      }
      room.add(socket);
      log("info", "room-subscribed", { roomCode, roomSize: room.size });
      break;
    }
    case "unsubscribe": {
      if (Array.isArray(message.topics) && message.topics.includes(roomCode)) {
        removeSocket(roomCode, socket);
      } else {
        log("warn", "unsubscribe-rejected", {
          roomCode,
          topics: Array.isArray(message.topics) ? message.topics : null
        });
      }
      break;
    }
    case "publish": {
      if (
        message.topic !== roomCode ||
        typeof message.data === "undefined" ||
        !rooms.get(roomCode)?.has(socket)
      ) {
        log("warn", "publish-rejected", {
          roomCode,
          topic: typeof message.topic === "string" ? message.topic : null,
          subscribed: rooms.get(roomCode)?.has(socket) ?? false,
          hasData: typeof message.data !== "undefined"
        });
        return;
      }

      const room = rooms.get(roomCode);
      const outgoing = {
        ...message,
        clients: room.size
      };
      log("info", "message-published", {
        roomCode,
        messageType:
          typeof message.data?.type === "string"
            ? message.data.type
            : "unknown",
        roomSize: room.size
      });
      for (const client of room) {
        send(client, outgoing, roomCode);
      }
      break;
    }
    case "ping": {
      log("debug", "ping-received", { roomCode });
      send(socket, { type: "pong" }, roomCode);
      break;
    }
    default:
      log("warn", "unknown-message-type", {
        roomCode,
        messageType: typeof message.type === "string" ? message.type : "missing"
      });
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      log("debug", "health-check");
      return new Response("ok");
    }

    const roomCode = url.pathname.slice(1);
    if (!ROOM_CODE_PATTERN.test(roomCode)) {
      log("warn", "invalid-room-path", { pathname: url.pathname });
      return new Response("Invalid room code.", { status: 404 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      log("warn", "websocket-upgrade-required", { roomCode });
      return new Response("WebSocket upgrade required.", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.addEventListener("message", event =>
      handleSignalingMessage(server, roomCode, event)
    );
    server.addEventListener("close", event => {
      log("info", "socket-closed", {
        roomCode,
        closeCode: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      removeSocket(roomCode, server);
    });
    server.addEventListener("error", event => {
      log("error", "socket-error", {
        roomCode,
        message:
          typeof event.message === "string"
            ? event.message
            : "WebSocket error event"
      });
      removeSocket(roomCode, server);
    });
    log("info", "websocket-accepted", { roomCode });

    return new Response(null, { status: 101, webSocket: client });
  }
};
