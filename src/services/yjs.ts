import * as Y from "yjs";
import { joinRoom, selfId } from "trystero/nostr";

export interface CardState {
  cardId: string;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  flipped: boolean;
  highlighted?: boolean;
  expanded?: boolean;
  scale?: number;
}

export interface TimelineItemState {
  itemId: string;
  kind: "token" | "note";
  x: number;
  y: number;
  zIndex: number;
  text: string;
  color: string;
  flowerId?: string;
  shellId?: string;
}

export interface TableSession {
  doc: Y.Doc;
  provider: TablePeerProvider;
  metadata: Y.Map<unknown>;
  cards: Y.Map<CardState>;
  timelineItems: Y.Map<TimelineItemState>;
  destroy: () => void;
}

type ProviderEventListener = () => void;

interface TablePeerProvider {
  awareness: {
    getStates: () => Map<string, unknown>;
    on: (event: "change", listener: ProviderEventListener) => void;
    off: (event: "change", listener: ProviderEventListener) => void;
  };
  on: (event: "peers", listener: ProviderEventListener) => void;
  off: (event: "peers", listener: ProviderEventListener) => void;
}

const JOIN_CODE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const APP_ID = "mhawes-counselling-cards";

export function generateTableCode(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(
    randomValues,
    value => JOIN_CODE_CHARACTERS[value % JOIN_CODE_CHARACTERS.length]
  ).join("");
}

export function createTableSession(tableCode: string): TableSession {
  const doc = new Y.Doc();
  const room = joinRoom({ appId: APP_ID }, tableCode, {
    onJoinError: details => {
      console.error("Nostr peer connection failed:", details);
    }
  });
  const peerListeners = new Set<ProviderEventListener>();
  const awarenessListeners = new Set<ProviderEventListener>();
  const remoteUpdateOrigin = Symbol("remote-yjs-update");
  const updateAction = room.makeAction<Uint8Array>("yjs-document-update");
  let destroyed = false;

  const notifyPeerChange = () => {
    peerListeners.forEach(listener => listener());
    awarenessListeners.forEach(listener => listener());
  };

  const provider: TablePeerProvider = {
    awareness: {
      getStates: () =>
        new Map([
          [selfId, {}],
          ...Object.keys(room.getPeers()).map(peerId => [peerId, {}] as const)
        ]),
      on: (_event, listener) => awarenessListeners.add(listener),
      off: (_event, listener) => awarenessListeners.delete(listener)
    },
    on: (_event, listener) => peerListeners.add(listener),
    off: (_event, listener) => peerListeners.delete(listener)
  };

  const sendUpdate = (update: Uint8Array, peerId?: string) => {
    void updateAction
      .send(update, peerId ? { target: peerId } : undefined)
      .catch(error => {
        console.error("Failed to send Yjs update over Trystero:", error);
      });
  };

  const onDocumentUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== remoteUpdateOrigin) {
      sendUpdate(update);
    }
  };
  doc.on("update", onDocumentUpdate);

  updateAction.onMessage = update => {
    Y.applyUpdate(doc, update, remoteUpdateOrigin);
  };

  room.onPeerJoin = peerId => {
    notifyPeerChange();
    sendUpdate(Y.encodeStateAsUpdate(doc), peerId);
  };
  room.onPeerLeave = notifyPeerChange;

  return {
    doc,
    provider,
    metadata: doc.getMap("table"),
    cards: doc.getMap<CardState>("cards"),
    timelineItems: doc.getMap<TimelineItemState>("timelineItems"),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      room.onPeerJoin = null;
      room.onPeerLeave = null;
      doc.off("update", onDocumentUpdate);
      void room.leave().catch(error => {
        console.error("Failed to leave Trystero room:", error);
      });
      doc.destroy();
    }
  };
}

export function getTableClientCount(provider: TablePeerProvider): number {
  return provider.awareness.getStates().size;
}

export function waitForRoomDiscovery(
  provider: TablePeerProvider,
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
