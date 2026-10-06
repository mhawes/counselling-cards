<template>
  <q-page class="table-page">
    <div ref="tableRef" class="table">
      <div
        v-for="card in cards"
        :key="card.id"
        class="table-card"
        :data-card-id="card.id"
        :data-x="card.x"
        :data-y="card.y"
        :style="{ zIndex: card.zIndex }"
      >
        <!--
          interact.js controls the outer element's position.
          Rotation and visual effects are handled by this inner element.
        -->
        <div
          class="card-visual"
          :style="{
            '--card-rotation': `${card.rotation}deg`,
          }"
        >
          <div class="card-inner">
            <img
              v-if="card.assetUrl"
              :src="card.assetUrl"
              :alt="card.alt || `Card ${card.id}`"
              class="card-image"
              draggable="false"
            />

            <div v-else class="card-placeholder">Card {{ card.id }}</div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import interact from "interactjs";

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
}

const tableRef = ref<HTMLElement | null>(null);

const CARD_WIDTH = 166;
const CARD_HEIGHT = 288;

let highestZIndex = 0;

const cards = ref<Card[]>([
  {
    id: "card-1",
    assetUrl: "src/assets/tarot-cats/0. The Fool.png",
    rotation: 0,
    alt: "Card 1",
    x: 0,
    y: 0,
    zIndex: 1,
  },
  {
    id: "card-2",
    assetUrl: "src/assets/tarot-cats/1. The Magician.png",
    rotation: 0,
    alt: "Card 2",
    x: 0,
    y: 0,
    zIndex: 2,
  },
  {
    id: "card-3",
    assetUrl: "src/assets/tarot-cats/2. The Priestess.png",
    rotation: 0,
    alt: "Card 3",
    x: 0,
    y: 0,
    zIndex: 3,
  },
  {
    id: "card-4",
    assetUrl: "src/assets/tarot-cats/3. The Empress.png",
    rotation: 0,
    alt: "Card 4",
    x: 0,
    y: 0,
    zIndex: 4,
  },
  {
    id: "card-5",
    assetUrl: "src/assets/tarot-cats/4. The Emperor.png",
    rotation: 0,
    alt: "Card 5",
    x: 0,
    y: 0,
    zIndex: 5,
  },
  {
    id: "card-6",
    assetUrl: "src/assets/tarot-cats/5. The Hierophant.png",
    rotation: 0,
    alt: "Card 6",
    x: 0,
    y: 0,
    zIndex: 6,
  },
  {
    id: "card-7",
    assetUrl: "src/assets/tarot-cats/6. The Lovers.png",
    rotation: 0,
    alt: "Card 7",
    x: 0,
    y: 0,
    zIndex: 7,
  },
  {
    id: "card-8",
    assetUrl: "src/assets/tarot-cats/7. The Chariot.png",
    rotation: 0,
    alt: "Card 8",
    x: 0,
    y: 0,
    zIndex: 8,
  },
  {
    id: "card-9",
    assetUrl: "src/assets/tarot-cats/8. Justice.png",
    rotation: 0,
    alt: "Card 9",
    x: 0,
    y: 0,
    zIndex: 9,
  },
  {
    id: "card-10",
    assetUrl: "src/assets/tarot-cats/9. The Hermit.png",
    rotation: 0,
    alt: "Card 10",
    x: 0,
    y: 0,
    zIndex: 10,
  },
  {
    id: "card-11",
    assetUrl: "src/assets/tarot-cats/10. Wheel of Fortune.png",
    rotation: 0,
    alt: "Card 11",
    x: 0,
    y: 0,
    zIndex: 11,
  },
  {
    id: "card-12",
    assetUrl: "src/assets/tarot-cats/11. Strength.png",
    rotation: 0,
    alt: "Card 12",
    x: 0,
    y: 0,
    zIndex: 12,
  },
  {
    id: "card-13",
    assetUrl: "src/assets/tarot-cats/12. The Hanged Man.png",
    rotation: 0,
    alt: "Card 13",
    x: 0,
    y: 0,
    zIndex: 13,
  },
  {
    id: "card-14",
    assetUrl: "src/assets/tarot-cats/13. Death.png",
    rotation: 0,
    alt: "Card 14",
    x: 0,
    y: 0,
    zIndex: 14,
  },
  {
    id: "card-15",
    assetUrl: "src/assets/tarot-cats/14. Temperance.png",
    rotation: 0,
    alt: "Card 15",
    x: 0,
    y: 0,
    zIndex: 15,
  },
  {
    id: "card-16",
    assetUrl: "src/assets/tarot-cats/15. The Devil.png",
    rotation: 0,
    alt: "Card 16",
    x: 0,
    y: 0,
    zIndex: 16,
  },
  {
    id: "card-17",
    assetUrl: "src/assets/tarot-cats/16. The Star.png",
    rotation: 0,
    alt: "Card 17",
    x: 0,
    y: 0,
    zIndex: 17,
  },
  {
    id: "card-18",
    assetUrl: "src/assets/tarot-cats/17. The Tower.png",
    rotation: 0,
    alt: "Card 18",
    x: 0,
    y: 0,
    zIndex: 18,
  },
  {
    id: "card-19",
    assetUrl: "src/assets/tarot-cats/18. The Moon.png",
    rotation: 0,
    alt: "Card 19",
    x: 0,
    y: 0,
    zIndex: 19,
  },
  {
    id: "card-20",
    assetUrl: "src/assets/tarot-cats/19. The Sun.png",
    rotation: 0,
    alt: "Card 20",
    x: 0,
    y: 0,
    zIndex: 20,
  },
  {
    id: "card-21",
    assetUrl: "src/assets/tarot-cats/20. Judgement.png",
    rotation: 0,
    alt: "Card 21",
    x: 0,
    y: 0,
    zIndex: 21,
  },
  {
    id: "card-22",
    assetUrl: "src/assets/tarot-cats/21. The World.png",
    rotation: 0,
    alt: "Card 22",
    x: 0,
    y: 0,
    zIndex: 22,
  },
]);

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

/**
 * Randomly position and rotate all cards.
 */
function randomiseCardPositions() {
  const table = tableRef.value;

  if (!table) {
    return;
  }

  const tableWidth = table.clientWidth;
  const tableHeight = table.clientHeight;

  const maxX = Math.max(0, tableWidth - CARD_WIDTH);
  const maxY = Math.max(0, tableHeight - CARD_HEIGHT);

  const elements = table.querySelectorAll<HTMLElement>(".table-card");

  elements.forEach((element) => {
    const cardId = element.dataset.cardId;

    if (!cardId) {
      return;
    }

    const card = cards.value.find((item) => item.id === cardId);

    if (!card) {
      return;
    }

    const x = Math.random() * maxX;
    const y = Math.random() * maxY;

    // Random rotation between -8 and +8 degrees
    const rotation = Math.round((Math.random() * 16 - 8) * 10) / 10;

    card.x = x;
    card.y = y;
    card.rotation = rotation;

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
        endOnly: false,
      }),
    ],

    /**
     * Automatically scroll the containing element when
     * the pointer gets close to its edge.
     */
    autoScroll: {
      container: tableRef.value ?? undefined,
      margin: 40,
      distance: 10,
      interval: 30,
    },

    listeners: {
      start(event) {
        const element = event.target as HTMLElement;
        const cardId = element.dataset.cardId;

        const card = cards.value.find((item) => item.id === cardId);

        if (card) {
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

        const card = cards.value.find((item) => item.id === cardId);

        if (!card) {
          return;
        }

        /**
         * Synchronise Vue's state with the final position.
         */
        card.x = parseFloat(element.dataset.x || "0");

        card.y = parseFloat(element.dataset.y || "0");
      },
    },
  });
}

onMounted(async () => {
  await nextTick();

  randomiseCardPositions();
  initialiseDragging();
});

onUnmounted(() => {
  interact(".table-card").unset();
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

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: radial-gradient(circle at center, #e8dcc8 0%, #d9c8ad 100%);
}

/*
 * The outer card is controlled by interact.js.
 */
.table-card {
  position: absolute;

  left: 0;
  top: 0;

  width: 166px;
  height: 288px;

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
  width: 100%;
  height: 100%;

  overflow: hidden;

  border-radius: 14px;

  background: white;

  box-shadow:
    0 4px 8px rgb(0 0 0 / 12%),
    0 10px 24px rgb(0 0 0 / 15%);

  transition: box-shadow 120ms ease;
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
