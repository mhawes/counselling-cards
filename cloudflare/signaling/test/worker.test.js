import assert from "node:assert/strict";
import test from "node:test";

import worker, { handleSignalingMessage } from "../worker.js";

class MockSocket {
  messages = [];
  readyState = 1;

  send(message) {
    this.messages.push(JSON.parse(message));
  }

  close() {
    this.readyState = 3;
  }
}

void test("relays published messages to subscribed clients in a room", () => {
  const first = new MockSocket();
  const second = new MockSocket();
  const otherRoom = new MockSocket();

  handleSignalingMessage(first, "ABCDE", {
    data: JSON.stringify({ type: "subscribe", topics: ["ABCDE"] })
  });
  handleSignalingMessage(second, "ABCDE", {
    data: JSON.stringify({ type: "subscribe", topics: ["ABCDE"] })
  });
  handleSignalingMessage(otherRoom, "FGHIJ", {
    data: JSON.stringify({ type: "subscribe", topics: ["FGHIJ"] })
  });
  handleSignalingMessage(first, "ABCDE", {
    data: JSON.stringify({
      type: "publish",
      topic: "ABCDE",
      data: { type: "announce", from: "first-client" }
    })
  });

  assert.deepEqual(first.messages, [
    {
      type: "publish",
      topic: "ABCDE",
      data: { type: "announce", from: "first-client" },
      clients: 2
    }
  ]);
  assert.deepEqual(second.messages, first.messages);
  assert.deepEqual(otherRoom.messages, []);
});

void test("unsubscribed clients no longer receive room messages", () => {
  const socket = new MockSocket();
  handleSignalingMessage(socket, "UVWXY", {
    data: JSON.stringify({ type: "subscribe", topics: ["UVWXY"] })
  });
  handleSignalingMessage(socket, "UVWXY", {
    data: JSON.stringify({ type: "unsubscribe", topics: ["UVWXY"] })
  });
  handleSignalingMessage(socket, "UVWXY", {
    data: JSON.stringify({
      type: "publish",
      topic: "UVWXY",
      data: { type: "announce", from: "unsubscribed-client" }
    })
  });

  assert.deepEqual(socket.messages, []);
});

void test("answers signaling protocol pings with pongs", () => {
  const socket = new MockSocket();
  handleSignalingMessage(socket, "PQRST", {
    data: JSON.stringify({ type: "ping" })
  });

  assert.deepEqual(socket.messages, [{ type: "pong" }]);
});

void test("serves a health check and rejects invalid room paths", async () => {
  const healthResponse = await worker.fetch(
    new Request("https://example.workers.dev/health")
  );
  const invalidRoomResponse = await worker.fetch(
    new Request("https://example.workers.dev/not-a-room")
  );

  assert.equal(healthResponse.status, 200);
  assert.equal(await healthResponse.text(), "ok");
  assert.equal(invalidRoomResponse.status, 404);
});
