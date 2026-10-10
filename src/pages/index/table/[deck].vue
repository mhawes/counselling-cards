<template>
  <q-page class="table-page">
    <div v-if="!deck" class="table no-deck">
      <div class="no-deck-message">
        <div class="text-h5">
          {{ tableError || "Joining table..." }}
        </div>
        <q-btn
          class="q-mt-md"
          color="primary"
          to="/"
          label="Back to home"
          no-caps
        />
      </div>
    </div>
    <div v-else ref="tableRef" class="table">
      <div
        v-for="card in cards"
        :key="card.id"
        class="table-card"
        :data-card-id="card.id"
        :data-x="card.x"
        :data-y="card.y"
        :style="{
          width: `calc(${deck.cardWidth}px * var(--card-scale, 1))`,
          height: `calc(${deck.cardHeight}px * var(--card-scale, 1))`,
          zIndex: card.zIndex
        }"
        @dblclick="toggleCardFlipped(card)"
      >
        <!--
          interact.js controls the outer element's position.
          Rotation and visual effects are handled by this inner element.
        -->
        <div
          class="card-visual"
          :style="{
            '--card-rotation': `${card.rotation}deg`
          }"
        >
          <div class="card-inner" :class="{ flipped: card.flipped }">
            <div class="card-face card-front">
              <img
                v-if="card.assetUrl"
                :src="card.assetUrl"
                :alt="card.alt || `Card ${card.id}`"
                class="card-image"
                draggable="false"
              />

              <div v-else class="card-placeholder">Card {{ card.id }}</div>
            </div>
            <div class="card-face card-back">
              <img
                :src="deck?.backImageUrl || ''"
                :alt="`${card.alt || `Card ${card.id}`} back`"
                class="card-image"
                draggable="false"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <q-page-sticky
      v-if="deck"
      class="table-controls"
      position="bottom-left"
      :offset="[18, 18]"
    >
      <q-fab
        color="primary"
        icon="more_vert"
        direction="up"
        vertical-actions-align="left"
      >
        <q-fab-action
          color="secondary"
          icon="shuffle"
          label="Shuffle and Stack Deck"
          @click="shuffleAndStackDeck"
        />
        <q-fab-action
          color="secondary"
          icon="scatter_plot"
          label="Scatter Cards"
          @click="scatterCards"
        />
      </q-fab>
    </q-page-sticky>
    <q-page-sticky v-if="deck" position="top-right" :offset="[18, 18]">
      <q-chip color="white" text-color="primary" icon="group">
        Join code: <strong class="q-ml-xs">{{ tableCodeLabel }}</strong>
      </q-chip>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import interact from "interactjs";
import { getDeckById, type Deck } from "@/decks";
import type { YMapEvent } from "yjs";
import {
  createTableSession,
  getTableClientCount,
  waitForRoomDiscovery,
  waitForTableReady,
  type CardState,
  type TableSession
} from "@/services/yjs";

interface Card {
  id: string;
  assetUrl?: string;
  alt?: string;

  // Position on the table
  x: number;
  y: number;

  // Rotation in degrees
  rotation: number;

  // Used to bring the dragged card to the front
  zIndex: number;

  // Whether the card is flipped to show its back
  flipped: boolean;
}

const route = useRoute();
const tableRef = ref<HTMLElement | null>(null);
const tableError = ref("");
const activeDeckId = ref<string | null>(null);
const tableCodeLabel = ref("");

let highestZIndex = 0;

const deck = computed<Deck | undefined>(() => {
  return activeDeckId.value ? getDeckById(activeDeckId.value) : undefined;
});

const cards = ref<Card[]>([]);
let tableSession: TableSession | null = null;
let disposed = false;
let tableWaitController: AbortController | null = null;
let cardStateObserver: ((event: YMapEvent<CardState>) => void) | null = null;

/**
 * Apply the position to a card.
 *
 * interact.js owns the transform, while Vue keeps the
 * x/y values available for application state and later
 * WebRTC synchronisation.
 */
function setCardPosition(element: HTMLElement, x: number, y: number) {
  element.dataset.x = String(x);
  element.dataset.y = String(y);

  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function randomCardRotation() {
  return Math.round((Math.random() * 16 - 8) * 10) / 10;
}

function getRenderedCardSize(table: HTMLElement, currentDeck: Deck) {
  const cardElement = table.querySelector<HTMLElement>(".table-card");
  return {
    width: cardElement?.offsetWidth || currentDeck.cardWidth,
    height: cardElement?.offsetHeight || currentDeck.cardHeight
  };
}

/**
 * Randomly position and rotate all cards.
 */
function randomiseCardPositions() {
  const table = tableRef.value;
  const currentDeck = deck.value;

  if (!table || !currentDeck) {
    return;
  }

  const tableWidth = table.clientWidth;
  const tableHeight = table.clientHeight;
  const cardSize = getRenderedCardSize(table, currentDeck);

  const maxX = Math.max(0, tableWidth - cardSize.width);
  const maxY = Math.max(0, tableHeight - cardSize.height);

  const elements = table.querySelectorAll<HTMLElement>(".table-card");

  elements.forEach(element => {
    const cardId = element.dataset.cardId;

    if (!cardId) {
      return;
    }

    const card = cards.value.find(item => item.id === cardId);

    if (!card) {
      return;
    }

    const x = Math.random() * maxX;
    const y = Math.random() * maxY;

    card.x = x;
    card.y = y;
    card.rotation = randomCardRotation();

    setCardPosition(element, x, y);
  });
}

/**
 * Configure interact.js dragging.
 */
function initialiseDragging() {
  interact(".table-card").draggable({
    inertia: false,

    /**
     * Prevent cards from being dragged outside the table.
     */
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: "parent",
        endOnly: false
      })
    ],

    /**
     * Automatically scroll the containing element when
     * the pointer gets close to its edge.
     */
    autoScroll: {
      container: tableRef.value ?? document.documentElement,
      margin: 40,
      distance: 10,
      interval: 30
    },

    listeners: {
      start(event) {
        const element = event.target as HTMLElement;
        const cardId = element.dataset.cardId;

        const card = cards.value.find(item => item.id === cardId);

        if (card) {
          highestZIndex = Math.max(
            highestZIndex,
            ...cards.value.map(item => item.zIndex)
          );
          card.zIndex = ++highestZIndex;
        }

        element.classList.add("is-dragging");
      },

      move(event) {
        const element = event.target as HTMLElement;

        const currentX = parseFloat(element.dataset.x || "0");

        const currentY = parseFloat(element.dataset.y || "0");

        const x = currentX + event.dx;
        const y = currentY + event.dy;

        setCardPosition(element, x, y);
      },

      end(event) {
        const element = event.target as HTMLElement;
        const cardId = element.dataset.cardId;

        element.classList.remove("is-dragging");

        const card = cards.value.find(item => item.id === cardId);

        if (!card) {
          return;
        }

        /**
         * Synchronise Vue's state with the final position.
         */
        card.x = parseFloat(element.dataset.x || "0");

        card.y = parseFloat(element.dataset.y || "0");
        card.rotation = randomCardRotation();

        /**
         * Broadcast the updated position and rotation to other clients.
         */
        broadcastCardState(card);
      }
    }
  });
}

function toCardState(card: Card): CardState {
  return {
    cardId: card.id,
    x: card.x,
    y: card.y,
    rotation: card.rotation,
    zIndex: card.zIndex,
    flipped: card.flipped
  };
}

function broadcastCardState(card: Card) {
  tableSession?.cards.set(card.id, toCardState(card));
}

function broadcastTableState() {
  if (!tableSession) return;
  tableSession.doc.transact(() => {
    cards.value.forEach(card => {
      tableSession?.cards.set(card.id, toCardState(card));
    });
  });
}

function shuffleAndStackDeck() {
  const table = tableRef.value;
  const currentDeck = deck.value;
  if (!table || !currentDeck || cards.value.length === 0) return;

  const cardSize = getRenderedCardSize(table, currentDeck);
  const maxStackOffset = 8;
  const stackOffsetSpace = Math.min(
    maxStackOffset,
    Math.max(0, table.clientWidth - cardSize.width - 12),
    Math.max(0, table.clientHeight - cardSize.height - 12)
  );
  const x = Math.max(
    0,
    table.clientWidth - cardSize.width - 12 - stackOffsetSpace
  );
  const y = Math.max(
    0,
    table.clientHeight - cardSize.height - 12 - stackOffsetSpace
  );
  const shuffledCards = [...cards.value];

  for (let i = shuffledCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const currentCard = shuffledCards[i];
    const otherCard = shuffledCards[j];
    if (currentCard && otherCard) {
      shuffledCards[i] = otherCard;
      shuffledCards[j] = currentCard;
    }
  }

  shuffledCards.forEach((card, index) => {
    const offset =
      shuffledCards.length > 1
        ? (index / (shuffledCards.length - 1)) * stackOffsetSpace
        : 0;
    card.x = x + offset;
    card.y = y + offset;
    card.zIndex = index + 1;
    card.flipped = true;

    const element = table.querySelector<HTMLElement>(
      `[data-card-id="${card.id}"]`
    );
    if (element) {
      setCardPosition(element, card.x, card.y);
    }
  });

  highestZIndex = cards.value.length;
  void broadcastTableState();
}

function scatterCards() {
  randomiseCardPositions();
  cards.value.forEach(card => {
    card.flipped = false;
  });
  void broadcastTableState();
}

/**
 * Broadcast a card flip to other connected clients.
 */
function toggleCardFlipped(card: Card) {
  card.flipped = !card.flipped;
  broadcastCardState(card);
}

/**
 * Apply a received full card state from another client.
 */
function applyCardStateUpdate(update: CardState) {
  const card = cards.value.find(item => item.id === update.cardId);
  if (!card) return;

  card.x = update.x;
  card.y = update.y;
  card.rotation = update.rotation;
  card.zIndex = update.zIndex;
  card.flipped = update.flipped;
  highestZIndex = Math.max(highestZIndex, update.zIndex);

  const element = tableRef.value?.querySelector<HTMLElement>(
    `[data-card-id="${update.cardId}"]`
  );
  if (element) {
    setCardPosition(element, update.x, update.y);
  }
}

function initialiseCardsFromSharedState() {
  const currentDeck = deck.value;
  const sharedCards = tableSession?.cards;
  if (!currentDeck || !sharedCards) return;

  highestZIndex = 0;
  cards.value = currentDeck.cards.map(deckCard => {
    const id = `${currentDeck.id}-${deckCard.id}`;
    const state = sharedCards.get(id);
    const card: Card = {
      id,
      assetUrl: deckCard.assetUrl,
      alt: deckCard.alt,
      x: state?.x ?? 0,
      y: state?.y ?? 0,
      rotation: state?.rotation ?? 0,
      zIndex: state?.zIndex ?? 0,
      flipped: state?.flipped ?? false
    };
    highestZIndex = Math.max(highestZIndex, card.zIndex);
    return card;
  });
}

function initialiseSharedTable(deckId: string) {
  const currentDeck = getDeckById(deckId);
  if (!tableSession || !currentDeck) {
    throw new Error("The deck for this table is not available in this client.");
  }

  tableSession.doc.transact(() => {
    tableSession?.metadata.set("deckId", deckId);
    currentDeck.cards.forEach((deckCard, index) => {
      const cardId = `${deckId}-${deckCard.id}`;
      tableSession?.cards.set(cardId, {
        cardId,
        x: 0,
        y: 0,
        rotation: 0,
        zIndex: index + 1,
        flipped: false
      });
    });
    tableSession?.metadata.set("ready", true);
  });
}

onMounted(async () => {
  const tableCode = String((route.params as { deck?: string }).deck ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{5}$/.test(tableCode)) {
    tableError.value = "Join codes must be five letters.";
    return;
  }
  tableCodeLabel.value = tableCode;
  tableSession = createTableSession(tableCode);
  tableWaitController = new AbortController();

  try {
    const requestedDeckId = String(route.query.deck ?? "");
    await waitForRoomDiscovery(
      tableSession.provider,
      1_500,
      5_000,
      tableWaitController.signal
    );
    if (disposed) return;

    const existingDeckId = tableSession.metadata.get("deckId");
    if (
      existingDeckId &&
      requestedDeckId &&
      existingDeckId !== requestedDeckId
    ) {
      throw new Error("This join code is already being used by another table.");
    }

    let createdTable = false;
    if (tableSession.metadata.get("ready") !== true) {
      if (requestedDeckId && getTableClientCount(tableSession.provider) === 1) {
        initialiseSharedTable(requestedDeckId);
        createdTable = true;
      } else {
        await waitForTableReady(
          tableSession.metadata,
          15_000,
          tableWaitController.signal
        );
      }
    }
    if (disposed) return;

    activeDeckId.value = String(tableSession.metadata.get("deckId") ?? "");
    if (!deck.value) {
      throw new Error(
        "The deck for this table is not available in this client."
      );
    }

    await nextTick();
    if (disposed) return;
    initialiseCardsFromSharedState();
    await nextTick();
    if (disposed) return;
    cards.value.forEach(card => {
      const element = tableRef.value?.querySelector<HTMLElement>(
        `[data-card-id="${card.id}"]`
      );
      if (element) {
        setCardPosition(element, card.x, card.y);
      }
    });

    cardStateObserver = event => {
      event.changes.keys.forEach((change, cardId) => {
        if (change.action !== "delete") {
          const state = tableSession?.cards.get(cardId);
          if (state) applyCardStateUpdate(state);
        }
      });
    };
    tableSession.cards.observe(cardStateObserver);

    if (createdTable && getTableClientCount(tableSession.provider) === 1) {
      scatterCards();
    }
    initialiseDragging();
  } catch (err) {
    if (disposed) return;
    tableError.value =
      err instanceof Error ? err.message : "Could not join this table.";
    console.error("Yjs table join failed:", err);
    tableSession?.destroy();
    tableSession = null;
  }
});

onUnmounted(() => {
  disposed = true;
  tableWaitController?.abort();
  tableWaitController = null;
  interact(".table-card").unset();
  if (tableSession && cardStateObserver) {
    tableSession.cards.unobserve(cardStateObserver);
  }
  tableSession?.destroy();
  tableSession = null;
});
</script>

<style scoped>
.table-page {
  width: 100%;
  height: 90vh;
  min-height: 90vh;

  overflow: hidden;
}

.table {
  position: relative;
  z-index: 0;
  --card-scale: 1;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: radial-gradient(circle at center, #e8dcc8 0%, #d9c8ad 100%);
}

@media (max-width: 600px) {
  .table {
    --card-scale: 0.5;
  }
}

.table-controls {
  z-index: 1;
}

.table.no-deck {
  display: flex;

  align-items: center;
  justify-content: center;
}

.no-deck-message {
  text-align: center;

  color: #555;
}

/*
 * The outer card is controlled by interact.js.
 */
.table-card {
  position: absolute;

  left: 0;
  top: 0;

  cursor: grab;

  /*
   * Important for dragging on touch devices.
   */
  touch-action: none;
  user-select: none;

  /*
   * Helps keep dragging smooth.
   */
  will-change: transform;
}

.table-card.is-dragging {
  cursor: grabbing;
}

/*
 * Rotation is applied here rather than to .table-card.
 *
 * This means interact.js can control translate3d()
 * without interfering with the card rotation.
 */
.card-visual {
  width: 100%;
  height: 100%;

  transform: rotate(var(--card-rotation));

  will-change: transform;

  transition: transform 120ms ease;
}

.table-card.is-dragging .card-visual {
  transform: scale(1.04) rotate(var(--card-rotation));

  transition: none;
}

.card-inner {
  position: relative;

  width: 100%;
  height: 100%;

  border-radius: 14px;

  background: white;

  box-shadow:
    0 4px 8px rgb(0 0 0 / 12%),
    0 10px 24px rgb(0 0 0 / 15%);

  transition:
    box-shadow 120ms ease,
    transform 0.6s ease;

  transform-style: preserve-3d;
  transform: rotateY(0deg);
}

.card-inner.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;

  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;

  border-radius: 14px;

  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-front {
  /* Default face, no extra transform needed */
}

.card-back {
  transform: rotateY(180deg);
}

.table-card:hover .card-inner {
  box-shadow:
    0 6px 12px rgb(0 0 0 / 14%),
    0 14px 28px rgb(0 0 0 / 18%);
}

.table-card.is-dragging .card-inner {
  box-shadow:
    0 12px 20px rgb(0 0 0 / 18%),
    0 25px 45px rgb(0 0 0 / 18%);
}

.card-image {
  display: block;

  width: 100%;
  height: 100%;

  object-fit: cover;

  pointer-events: none;
}

.card-placeholder {
  display: flex;

  align-items: center;
  justify-content: center;

  width: 100%;
  height: 100%;

  padding: 20px;

  text-align: center;

  color: #777;
  background: #eee;

  font-size: 18px;
}
</style>
