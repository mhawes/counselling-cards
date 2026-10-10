import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

export interface CardState {
  cardId: string;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  flipped: boolean;
}

export interface TableSession {
  doc: Y.Doc;
  provider: WebrtcProvider;
  metadata: Y.Map<unknown>;
  cards: Y.Map<CardState>;
  destroy: () => void;
}

const JOIN_CODE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateTableCode(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(
    randomValues,
    value => JOIN_CODE_CHARACTERS[value % JOIN_CODE_CHARACTERS.length]
  ).join("");
}

function getSignalingServers(tableCode: string): string[] | undefined {
  const configuredUrl = import.meta.env.VITE_YJS_SIGNALING_URL?.trim();
  if (!configuredUrl) {
    return undefined;
  }

  const signalingUrl = new URL(configuredUrl);
  if (signalingUrl.protocol !== "wss:" && signalingUrl.protocol !== "ws:") {
    throw new Error("The Yjs signaling URL must use ws:// or wss://.");
  }
  signalingUrl.pathname = `${signalingUrl.pathname.replace(/\/+$/, "")}/${encodeURIComponent(tableCode)}`;
  return [signalingUrl.toString()];
}

export function createTableSession(tableCode: string): TableSession {
  const doc = new Y.Doc();
  const signaling = getSignalingServers(tableCode);
  const provider = new WebrtcProvider(
    tableCode,
    doc,
    signaling ? { signaling } : undefined
  );
  return {
    doc,
    provider,
    metadata: doc.getMap("table"),
    cards: doc.getMap<CardState>("cards"),
    destroy() {
      provider.destroy();
      doc.destroy();
    }
  };
}

export function getTableClientCount(provider: WebrtcProvider): number {
  return provider.awareness.getStates().size;
}

export function waitForRoomDiscovery(
  provider: WebrtcProvider,
  quietMs = 1_500,
  maxWaitMs = 5_000,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new Error("Table join was cancelled."));
  }

  return new Promise((resolve, reject) => {
    let quietTimeout: ReturnType<typeof setTimeout>;
    let maxTimeout: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(quietTimeout);
      clearTimeout(maxTimeout);
      provider.off("peers", onPeers);
      provider.awareness.off("change", onAwarenessChange);
      signal?.removeEventListener("abort", onAbort);
    };
    function finish() {
      cleanup();
      resolve();
    }
    const scheduleFinish = () => {
      clearTimeout(quietTimeout);
      quietTimeout = setTimeout(finish, quietMs);
    };
    const onPeers = () => scheduleFinish();
    const onAwarenessChange = () => scheduleFinish();
    const onAbort = () => {
      cleanup();
      reject(new Error("Table join was cancelled."));
    };

    maxTimeout = setTimeout(finish, maxWaitMs);
    provider.on("peers", onPeers);
    provider.awareness.on("change", onAwarenessChange);
    signal?.addEventListener("abort", onAbort, { once: true });
    scheduleFinish();
  });
}

export function waitForTableReady(
  metadata: Y.Map<unknown>,
  timeoutMs = 15_000,
  signal?: AbortSignal
): Promise<void> {
  if (metadata.get("ready") === true) {
    return Promise.resolve();
  }
  if (signal?.aborted) {
    return Promise.reject(new Error("Table join was cancelled."));
  }

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timeout);
      metadata.unobserve(onMetadataChange);
      signal?.removeEventListener("abort", onAbort);
    };
    const onMetadataChange = () => {
      if (metadata.get("ready") === true) {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("Table join was cancelled."));
    };
    timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Could not find an active table. Ask the table creator to reconnect and try again."
        )
      );
    }, timeoutMs);

    signal?.addEventListener("abort", onAbort, { once: true });
    metadata.observe(onMetadataChange);
    onMetadataChange();
  });
}
