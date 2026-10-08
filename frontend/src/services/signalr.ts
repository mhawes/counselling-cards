import * as signalR from "@microsoft/signalr";

const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL ?? "http://localhost:5271";

let connection: signalR.HubConnection | null = null;

/**
 * Start a SignalR connection to the table state hub.
 */
export async function startConnection(): Promise<signalR.HubConnection> {
  console.log("[SignalR] startConnection() called, current connection state:", connection?.state ?? "null");

  if (connection?.state === signalR.HubConnectionState.Connected) {
    console.log("[SignalR] Returning existing connected connection");
    return connection;
  }

  // If we have a connection that's not connected, try to restart it first
  if (connection !== null) {
    console.log("[SignalR] Attempting to restart existing connection");
    try {
      await connection.start();
      console.log("[SignalR] Restarted existing connection, state:", connection.state);
      return connection;
    } catch (err) {
      console.warn("[SignalR] Restart failed, creating new connection:", err);
      // If restart fails, create a new connection
      connection = null;
    }
  }

  console.log("[SignalR] Creating new HubConnection");
  const hub = new signalR.HubConnectionBuilder()
    .withUrl(`${SIGNALR_URL}/tableStateHub`)
    .withAutomaticReconnect()
    .build();

  hub.onclose((error) => {
    console.warn("[SignalR] Connection closed:", error);
  });
  hub.onreconnecting((error) => {
    console.warn("[SignalR] Reconnecting:", error);
  });
  hub.onreconnected((connectionId) => {
    console.log("[SignalR] Reconnected with connection ID:", connectionId);
  });

  await hub.start();
  console.log("[SignalR] Connection started, state:", hub.state);
  connection = hub;
  return hub;
}

/**
 * Get the current SignalR connection (may not be connected yet).
 */
export function getConnection(): signalR.HubConnection | null {
  return connection;
}

/**
 * Stop the SignalR connection.
 */
export function stopConnection(): Promise<void> {
  if (connection) {
    const promise = connection.stop();
    connection = null;
    return promise;
  }
  return Promise.resolve();
}
