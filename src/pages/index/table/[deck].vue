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
    <div
      v-else
      ref="tableRef"
      class="table"
      :class="{ 'has-expanded-card': expandedCard }"
    >
      <div
        v-for="card in cards"
        :key="card.id"
        class="table-card"
        :data-card-id="card.id"
        :data-x="card.x"
        :data-y="card.y"
        :class="{ 'is-expanded': card.expanded }"
        :style="{
          width: `calc(${deck.cardWidth}px * var(--card-scale, 1) * ${card.scale})`,
          height: `calc(${deck.cardHeight}px * var(--card-scale, 1) * ${card.scale})`,
          zIndex: card.zIndex
        }"
        @dblclick="toggleCardFlipped(card)"
        @click="handleCardClick($event, card)"
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
          <div
            class="card-inner"
            :class="{ flipped: card.flipped, highlighted: card.highlighted }"
          >
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
        <div v-if="card.expanded && !card.flipped" class="expanded-card-alt">
          {{ card.alt || `Card ${card.id}` }}
        </div>
        <div class="card-action-buttons">
          <q-btn
            v-if="card.expanded && card.flipped"
            round
            dense
            unelevated
            size="md"
            color="white"
            text-color="dark"
            icon="flip"
            aria-label="Flip card"
            @click.stop="toggleCardFlipped(card)"
          >
            <q-tooltip>Flip card</q-tooltip>
          </q-btn>
          <q-btn
            round
            dense
            unelevated
            :size="card.expanded ? 'md' : 'xs'"
            color="white"
            text-color="dark"
            :icon="card.expanded ? 'close_fullscreen' : 'open_in_full'"
            :aria-label="card.expanded ? 'Return card to table' : 'Expand card'"
            @click.stop="toggleCardExpanded(card)"
          >
            <q-tooltip>
              {{ card.expanded ? "Return card to table" : "Expand card" }}
            </q-tooltip>
          </q-btn>
          <q-btn
            round
            dense
            unelevated
            :size="card.expanded ? 'md' : 'xs'"
            color="white"
            text-color="dark"
            :icon="card.highlighted ? 'star' : 'star_outline'"
            :aria-label="
              card.highlighted ? 'Remove card highlight' : 'Highlight card'
            "
            @click.stop="toggleCardHighlight(card)"
          >
            <q-tooltip>
              {{ card.highlighted ? "Remove highlight" : "Highlight card" }}
            </q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>
    <q-page-sticky
      v-if="deck"
      class="table-controls"
      position="bottom-left"
      :offset="[18, 18]"
    >
      <div class="column items-start">
        <q-fab
          color="primary"
          icon="more_vert"
          direction="up"
          vertical-actions-align="left"
        >
          <q-fab-action
            color="primary"
            icon="collections"
            label="Collect Highlighted Cards"
            :disable="!hasHighlightedCards"
            @click="collectHighlightedCards"
          />
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
          <q-fab-action
            color="accent"
            icon="help_outline"
            label="Help"
            @click="helpDialogOpen = true"
          />
        </q-fab>
      </div>
    </q-page-sticky>
    <q-dialog v-model="helpDialogOpen">
      <q-card class="help-dialog">
        <q-card-section>
          <div class="text-h6">How to use the card table</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <ul class="q-my-none q-pl-md">
            <li><strong>Drag</strong> a card to move it around the table.</li>
            <li>
              <strong>Double-click</strong> a card to flip it. When an expanded
              card is face down, use its flip button to reveal it.
            </li>
            <li>
              Use the card's <strong>expand button</strong> to enlarge it above
              the table and dim the background. Click the enlarged card or its
              button to return it. On desktop, hover over a card to reveal its
              action buttons.
            </li>
            <li>
              Use the card's <strong>highlight button</strong> to toggle its
              highlight. Shift-click also toggles the highlight.
            </li>
            <li>
              Use <strong>Collect Highlighted Cards</strong> to show highlighted
              cards together in the center and stack the rest at the bottom
              right.
            </li>
            <li>
              Use <strong>Shuffle and Stack Deck</strong> to shuffle and stack
              cards face down, or <strong>Scatter Cards</strong> to spread them
              face up.
            </li>
          </ul>
          <div class="q-mt-md">
            Card positions, flips, highlights, and layouts are shared with
            everyone at this table.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Close" color="primary" />
        </q-card-actions>
      </q-card>
    </q-dialog>
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

  // Whether the card has a shared highlight
  highlighted: boolean;

  // Whether the card is shown enlarged above the table
  expanded: boolean;

  // Relative size used to fit a collected layout on the table
  scale: number;
}

const route = useRoute();
const tableRef = ref<HTMLElement | null>(null);
const tableError = ref("");
const activeDeckId = ref<string | null>(null);
const tableCodeLabel = ref("");
const helpDialogOpen = ref(false);

let highestZIndex = 0;

const deck = computed<Deck | undefined>(() => {
  return activeDeckId.value ? getDeckById(activeDeckId.value) : undefined;
});

const cards = ref<Card[]>([]);
const expandedCard = computed(() => cards.value.find(card => card.expanded));
const hasHighlightedCards = computed(() =>
  cards.value.some(card => card.highlighted)
);
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
  const baseScale =
    Number.parseFloat(
      getComputedStyle(table).getPropertyValue("--card-scale")
    ) || 1;
  return {
    width: currentDeck.cardWidth * baseScale,
    height: currentDeck.cardHeight * baseScale
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
    ignoreFrom: ".card-action-buttons",

    listeners: {
      start(event) {
        const element = event.target as HTMLElement;
        const cardId = element.dataset.cardId;

        const card = cards.value.find(item => item.id === cardId);

        if (!card || card.expanded) return;

        highestZIndex = Math.max(
          highestZIndex,
          ...cards.value.map(item => item.zIndex)
        );
        card.zIndex = ++highestZIndex;

        element.classList.add("is-dragging");
      },

      move(event) {
        const element = event.target as HTMLElement;
        const card = cards.value.find(
          item => item.id === element.dataset.cardId
        );
        if (!card || card.expanded) return;

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

        if (!card || card.expanded) {
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
    flipped: card.flipped,
    highlighted: card.highlighted,
    expanded: card.expanded,
    scale: card.scale
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
    card.highlighted = false;
    card.expanded = false;
    card.scale = 1;

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
    card.highlighted = false;
    card.expanded = false;
    card.scale = 1;
  });
  void broadcastTableState();
}

function collectHighlightedCards() {
  const table = tableRef.value;
  const currentDeck = deck.value;
  if (!table || !currentDeck) return;

  const highlightedCards = cards.value.filter(card => card.highlighted);
  if (highlightedCards.length === 0) return;

  const baseScale =
    Number.parseFloat(
      getComputedStyle(table).getPropertyValue("--card-scale")
    ) || 1;
  const cardWidth = currentDeck.cardWidth * baseScale;
  const cardHeight = currentDeck.cardHeight * baseScale;
  const gap = 20 * baseScale;
  const margin = 24;
  const availableWidth = Math.max(1, table.clientWidth - margin * 2);
  const availableHeight = Math.max(1, table.clientHeight - margin * 2);
  let layout = {
    columns: 1,
    rows: highlightedCards.length,
    gap,
    scale: 0
  };

  for (let columns = 1; columns <= highlightedCards.length; columns++) {
    const rows = Math.ceil(highlightedCards.length / columns);
    const layoutGap = Math.min(
      gap,
      columns > 1 ? availableWidth / (columns - 1) / 2 : gap,
      rows > 1 ? availableHeight / (rows - 1) / 2 : gap
    );
    const scale = Math.min(
      1,
      (availableWidth - layoutGap * (columns - 1)) / (cardWidth * columns),
      (availableHeight - layoutGap * (rows - 1)) / (cardHeight * rows)
    );
    if (scale > layout.scale) {
      layout = { columns, rows, gap: layoutGap, scale };
    }
  }

  const displayedWidth = cardWidth * layout.scale;
  const displayedHeight = cardHeight * layout.scale;
  const gridWidth =
    layout.columns * displayedWidth + (layout.columns - 1) * layout.gap;
  const gridHeight =
    layout.rows * displayedHeight + (layout.rows - 1) * layout.gap;
  const startX = (table.clientWidth - gridWidth) / 2;
  const startY = (table.clientHeight - gridHeight) / 2;
  const remainingCards = cards.value.filter(card => !card.highlighted);

  for (let i = remainingCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingCards[i], remainingCards[j]] = [
      remainingCards[j]!,
      remainingCards[i]!
    ];
  }

  const stackOffset = Math.min(
    8 * baseScale,
    Math.max(0, table.clientWidth - cardWidth - margin),
    Math.max(0, table.clientHeight - cardHeight - margin)
  );
  const stackX = Math.max(
    0,
    table.clientWidth - cardWidth - margin - stackOffset
  );
  const stackY = Math.max(
    0,
    table.clientHeight - cardHeight - margin - stackOffset
  );

  remainingCards.forEach((card, index) => {
    const offset =
      remainingCards.length > 1
        ? (index / (remainingCards.length - 1)) * stackOffset
        : 0;
    card.x = stackX + offset;
    card.y = stackY + offset;
    card.rotation = 0;
    card.zIndex = index + 1;
    card.flipped = true;
    card.expanded = false;
    card.scale = 1;
  });

  highlightedCards.forEach((card, index) => {
    card.x = startX + (index % layout.columns) * (displayedWidth + layout.gap);
    card.y =
      startY +
      Math.floor(index / layout.columns) * (displayedHeight + layout.gap);
    card.rotation = 0;
    card.zIndex = remainingCards.length + index + 1;
    card.flipped = false;
    card.expanded = false;
    card.highlighted = false;
    card.scale = layout.scale;
  });

  highestZIndex = cards.value.length;
  void broadcastTableState();
}

/**
 * Broadcast a card flip to other connected clients.
 */
function toggleCardFlipped(card: Card) {
  card.flipped = !card.flipped;
  broadcastCardState(card);
}

function toggleCardExpanded(card: Card) {
  const expanded = !card.expanded;
  cards.value.forEach(item => {
    item.expanded = expanded && item.id === card.id;
  });
  broadcastTableState();
}

function toggleCardHighlight(card: Card) {
  card.highlighted = !card.highlighted;
  card.scale = 1;
  broadcastCardState(card);
}

function handleCardClick(event: MouseEvent, card: Card) {
  if (event.ctrlKey) {
    event.preventDefault();
    toggleCardExpanded(card);
    return;
  }

  if (card.expanded) {
    card.expanded = false;
    broadcastCardState(card);
    return;
  }

  if (!event.shiftKey) return;

  toggleCardHighlight(card);
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
  card.highlighted = update.highlighted ?? false;
  card.expanded = update.expanded ?? false;
  card.scale = update.scale ?? 1;
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
      flipped: state?.flipped ?? false,
      highlighted: state?.highlighted ?? false,
      expanded: state?.expanded ?? false,
      scale: state?.scale ?? 1
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
        flipped: false,
        highlighted: false,
        expanded: false,
        scale: 1
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

.table.has-expanded-card::after {
  position: absolute;
  z-index: 1000;
  inset: 0;

  background: rgb(0 0 0 / 65%);

  content: "";
  pointer-events: none;
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

.help-dialog {
  width: min(560px, 90vw);
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

.card-action-buttons {
  position: absolute;
  z-index: 2;
  top: 3px;
  right: 3px;

  display: flex;
  gap: 3px;
}

@media (hover: hover) and (pointer: fine) {
  .card-action-buttons {
    visibility: hidden;
    opacity: 0;

    transition: opacity 120ms ease;
  }

  .table-card:hover .card-action-buttons,
  .table-card:focus-within .card-action-buttons {
    visibility: visible;
    opacity: 1;
  }

  .table-card.is-expanded .card-action-buttons {
    visibility: visible;
    opacity: 1;
  }
}

.table-card.is-expanded {
  position: fixed;
  z-index: 1001 !important;
  top: 50%;
  left: 50%;

  transform: translate(-50%, -50%) !important;
  cursor: zoom-out;
}

.table-card.is-expanded .card-visual {
  transform: scale(2.5) rotate(var(--card-rotation));
}

.expanded-card-alt {
  position: absolute;
  bottom: calc(175% + 12px);
  left: 50%;

  width: min(80vw, 600px);
  transform: translateX(-50%);
  color: white;
  font-size: clamp(14px, 2.5vw, 24px);
  font-weight: 600;
  text-align: center;
  text-shadow: 0 1px 4px rgb(0 0 0 / 80%);
}

.table-card.is-expanded .card-action-buttons {
  top: calc(175% + 12px);
  right: auto;
  left: 50%;

  transform: translateX(-50%);
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

.card-inner.highlighted {
  outline: 3px solid white;
  outline-offset: 1px;
  box-shadow:
    0 4px 8px rgb(0 0 0 / 12%),
    0 10px 24px rgb(0 0 0 / 15%),
    0 0 8px 3px rgba(16, 59, 255, 0.95),
    0 0 16px 6px rgba(1, 132, 255, 0.7);
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
