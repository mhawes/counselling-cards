<template>
  <div class="timeline-workspace">
    <header class="timeline-toolbar">
      <div>
        <div class="text-h6">Timeline</div>
        <div class="text-caption">
          Add and move tokens; edit notes directly. Changes are shared live.
        </div>
      </div>
      <div class="timeline-toolbar-actions">
        <q-btn
          color="primary"
          icon="add_circle"
          label="Add token"
          no-caps
          @click="addItem('token')"
        />
        <q-btn
          color="secondary"
          icon="note_add"
          label="Add note"
          no-caps
          @click="addItem('note')"
        />
        <q-chip color="white" text-color="primary" icon="group">
          Join code: <strong class="q-ml-xs">{{ tableCode }}</strong>
        </q-chip>
      </div>
    </header>
    <div ref="scrollRef" class="timeline-scroll" @scroll="updateScrollViewport">
      <div
        ref="canvasRef"
        class="timeline-canvas"
        :style="{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`
        }"
      >
        <div
          class="timeline-axis"
          :style="{ top: `${timelineCenterOffset - 2}px` }"
          aria-hidden="true"
        />
        <div
          v-for="item in items"
          v-show="item.kind === 'note' && draggingItemId !== item.itemId"
          :key="`${item.itemId}-connector`"
          class="timeline-note-connector"
          :style="noteConnectorStyle(item)"
          aria-hidden="true"
        />
        <div
          v-for="item in items"
          :key="item.itemId"
          class="timeline-item"
          :class="{
            'timeline-note': item.kind === 'note',
            'timeline-token-item': item.kind === 'token'
          }"
          :data-item-id="item.itemId"
          :data-x="item.x"
          :data-y="item.y"
          :style="{
            transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
            zIndex: item.zIndex
          }"
        >
          <div
            v-if="item.kind === 'token'"
            class="timeline-token-group"
            :style="{
              '--input-hover-background': itemInputHoverBackground(
                item.color,
                item.kind
              )
            }"
          >
            <q-input
              class="timeline-note-field"
              :model-value="item.text"
              dense
              borderless
              maxlength="40"
              input-class="timeline-token-label"
              input-style="color: #3b3526"
              aria-label="Edit token label"
              @update:model-value="updateTokenText(item, $event)"
            />
            <img
              v-if="item.flowerId && flowerImageUrls[item.flowerId]"
              class="timeline-flower-image"
              :src="flowerImageUrls[item.flowerId]"
              alt="Flower token"
              draggable="false"
            />
            <img
              v-else-if="item.shellId && shellImageUrls[item.shellId]"
              class="timeline-flower-image"
              :src="shellImageUrls[item.shellId]"
              alt="Shell token"
              draggable="false"
            />
            <div
              v-else-if="!item.flowerId && !item.shellId"
              class="timeline-token"
              :style="{ backgroundColor: item.color }"
              role="img"
              aria-label="Timeline token"
            >
              <q-icon name="circle" size="18px" />
            </div>
          </div>
          <div
            v-if="item.kind === 'note'"
            class="timeline-note-paper"
            :style="{
              backgroundColor: item.color,
              '--input-hover-background': itemInputHoverBackground(
                item.color,
                item.kind
              )
            }"
          >
            <q-input
              :model-value="item.text"
              type="textarea"
              rows="4"
              borderless
              maxlength="2000"
              input-class="timeline-note-input"
              :input-style="{
                resize: 'none',
                overflow: 'hidden',
                color: itemTextColor(item.color)
              }"
              aria-label="Edit timeline note"
              placeholder="Write a note..."
              @update:model-value="updateNoteText(item, $event)"
            />
          </div>
          <q-btn
            class="timeline-item-color"
            :class="{ 'timeline-token-control': item.kind === 'token' }"
            round
            dense
            flat
            size="sm"
            color="dark"
            icon="palette"
            aria-label="Choose item colour"
            @click.stop
          >
            <q-menu>
              <div class="timeline-color-picker">
                <q-btn
                  v-for="color in ITEM_COLORS"
                  :key="color"
                  round
                  dense
                  unelevated
                  class="timeline-color-swatch"
                  v-close-popup
                  :style="{ backgroundColor: color }"
                  :aria-label="`Choose ${color}`"
                  @click="updateItemColor(item, color)"
                />
                <q-btn
                  v-if="item.kind === 'token'"
                  flat
                  no-caps
                  icon="local_florist"
                  class="timeline-color-picker-flower"
                  v-close-popup
                  @click.stop="openFlowerPicker(item.itemId)"
                />
                <q-btn
                  v-if="item.kind === 'token'"
                  flat
                  no-caps
                  icon="water"
                  class="timeline-color-picker-flower"
                  v-close-popup
                  @click.stop="openShellPicker(item.itemId)"
                />
              </div>
            </q-menu>
          </q-btn>
          <q-btn
            class="timeline-item-delete"
            :class="{ 'timeline-token-control': item.kind === 'token' }"
            round
            dense
            flat
            size="sm"
            color="dark"
            icon="close"
            :aria-label="`Remove ${item.kind}`"
            @click.stop="removeItem(item.itemId)"
          />
        </div>
      </div>
    </div>
    <q-dialog v-model="flowerPickerOpen">
      <q-card class="flower-picker">
        <q-card-section class="row items-center q-pb-sm">
          <div class="text-h6">Choose a flower</div>
          <q-space />
          <q-btn
            v-close-popup
            round
            dense
            flat
            icon="close"
            aria-label="Close"
          />
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-virtual-scroll
            class="flower-picker-scroll"
            :items="flowerRows"
            :virtual-scroll-item-size="76"
            v-slot="{ item: row }"
          >
            <div class="flower-picker-row">
              <q-btn
                v-for="flower in row"
                :key="flower.id"
                flat
                round
                class="flower-picker-option"
                :aria-label="`Choose flower ${flower.id}`"
                @click="chooseFlower(flower.id)"
              >
                <img :src="flower.url" alt="" draggable="false" />
              </q-btn>
            </div>
          </q-virtual-scroll>
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog v-model="shellPickerOpen">
      <q-card class="flower-picker shell-picker">
        <q-card-section class="row items-center q-pb-sm">
          <div class="text-h6">Choose a shell</div>
          <q-space />
          <q-btn
            v-close-popup
            round
            dense
            flat
            icon="close"
            aria-label="Close"
          />
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-virtual-scroll
            class="flower-picker-scroll"
            :items="shellRows"
            :virtual-scroll-item-size="120"
            v-slot="{ item: row }"
          >
            <div class="flower-picker-row shell-picker-row">
              <q-btn
                v-for="shell in row"
                :key="shell.id"
                flat
                round
                class="flower-picker-option shell-picker-option"
                :aria-label="`Choose shell ${shell.id}`"
                @click="chooseShell(shell.id)"
              >
                <img
                  class="shell-picker-image"
                  :src="shell.url"
                  alt=""
                  draggable="false"
                />
              </q-btn>
            </div>
          </q-virtual-scroll>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import interact from "interactjs";
import type { YMapEvent } from "yjs";
import type { TableSession, TimelineItemState } from "@/services/yjs";

const props = defineProps<{
  sharedItems: TableSession["timelineItems"];
  tableCode: string;
}>();

type TimelineItem = TimelineItemState;
interface TokenObjectAsset {
  id: string;
  url: string;
}

const flowerImageUrls = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("@/assets/token-objects/flowers/*.png", {
      eager: true,
      query: "?url",
      import: "default"
    })
  ).map(([path, url]) => {
    const filename = path.split(/[\\/]/).at(-1) ?? "";
    return [filename.replace(/\.png$/, ""), url];
  })
);
const flowers: TokenObjectAsset[] = Object.entries(flowerImageUrls)
  .map(([id, url]) => ({ id, url }))
  .sort((first, second) => first.id.localeCompare(second.id));
const shellImageUrls = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("@/assets/token-objects/shells/*.png", {
      eager: true,
      query: "?url",
      import: "default"
    })
  ).map(([path, url]) => {
    const filename = path.split(/[\\/]/).at(-1) ?? "";
    return [filename.replace(/\.png$/, ""), url];
  })
);
const shells: TokenObjectAsset[] = Object.entries(shellImageUrls)
  .map(([id, url]) => ({ id, url }))
  .sort((first, second) => first.id.localeCompare(second.id));
const ITEM_COLORS = [
  "#d66b4d",
  "#4f83a1",
  "#7b8d42",
  "#9272a8",
  "#d19a35",
  "#e7a3a1",
  "#f3d878",
  "#a8d5ba",
  "#8ecae6",
  "#b8a1d9",
  "#f4a261",
  "#f2eee8"
];
const ITEM_SPACING = 56;
const items = ref<TimelineItem[]>([]);
const canvasRef = ref<HTMLElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
const draggingItemId = ref<string | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(600);
const timelineCenterOffset = ref(300);
const flowerPickerOpen = ref(false);
const shellPickerOpen = ref(false);
const selectedTokenId = ref<string | null>(null);
const timelineY = computed(() => scrollTop.value + timelineCenterOffset.value);
const flowerRows = computed(() => {
  const rows: TokenObjectAsset[][] = [];
  for (let i = 0; i < flowers.length; i += 8) {
    rows.push(flowers.slice(i, i + 8));
  }
  return rows;
});
const shellRows = computed(() => {
  const rows: TokenObjectAsset[][] = [];
  for (let i = 0; i < shells.length; i += 6) {
    rows.push(shells.slice(i, i + 6));
  }
  return rows;
});
const canvasWidth = computed(() => {
  const rightEdge = items.value.reduce(
    (right, item) =>
      Math.max(right, item.x + (item.kind === "note" ? 200 : 52) + 120),
    0
  );
  return Math.max(window.innerWidth, rightEdge);
});
const canvasHeight = computed(() =>
  Math.max(
    480,
    viewportHeight.value,
    ...items.value.map(
      item => item.y + (item.kind === "note" ? 140 : 52) + viewportHeight.value
    )
  )
);
let highestZIndex = 0;
let itemObserver: ((event: YMapEvent<TimelineItemState>) => void) | null = null;
let viewportObserver: ResizeObserver | null = null;

function updateScrollViewport() {
  if (!scrollRef.value) return;
  scrollTop.value = scrollRef.value.scrollTop;
  viewportHeight.value = scrollRef.value.clientHeight;
  timelineCenterOffset.value = scrollRef.value.clientHeight / 2;
  items.value.forEach(item => {
    if (item.kind !== "note") return;
    const y = clampNoteY(item.y);
    if (y === item.y) return;
    item.y = y;
    syncItem(item);
  });
}

function clampNoteY(y: number) {
  return Math.min(
    Math.max(0, y),
    Math.max(0, scrollTop.value + viewportHeight.value - 140)
  );
}

function applyItemState(state: TimelineItemState) {
  const existingItem = items.value.find(item => item.itemId === state.itemId);
  if (existingItem) {
    Object.assign(existingItem, state);
    return;
  }
  items.value.push({ ...state });
  highestZIndex = Math.max(highestZIndex, state.zIndex);
}

function itemState(item: TimelineItem): TimelineItemState {
  return { ...item };
}

function syncItem(item: TimelineItem) {
  props.sharedItems.set(item.itemId, itemState(item));
}

function addItem(kind: TimelineItem["kind"]) {
  const x = items.value.reduce(
    (right, item) =>
      Math.max(
        right,
        item.x + (item.kind === "note" ? 200 : 52) + ITEM_SPACING
      ),
    80
  );
  const centerY = timelineY.value;
  const noteCount = items.value.filter(item => item.kind === "note").length;
  const requestedY =
    kind === "token"
      ? centerY - 26
      : centerY + (noteCount % 2 === 0 ? -180 : 40);
  const y = kind === "note" ? clampNoteY(requestedY) : requestedY;
  const item: TimelineItem = {
    itemId: crypto.randomUUID(),
    kind,
    x,
    y,
    zIndex: ++highestZIndex,
    text: "",
    color: items.value.at(-1)?.color ?? ITEM_COLORS[0]!
  };
  items.value.push(item);
  syncItem(item);
}

function updateItemColor(item: TimelineItem, color: string) {
  item.color = color;
  if (item.kind === "token") {
    delete item.flowerId;
    delete item.shellId;
  }
  syncItem(item);
}

function openFlowerPicker(itemId: string) {
  selectedTokenId.value = itemId;
  flowerPickerOpen.value = true;
}

function chooseFlower(flowerId: string) {
  const item = items.value.find(
    entry => entry.itemId === selectedTokenId.value
  );
  if (!item || item.kind !== "token") return;
  delete item.shellId;
  item.flowerId = flowerId;
  syncItem(item);
  flowerPickerOpen.value = false;
}

function openShellPicker(itemId: string) {
  selectedTokenId.value = itemId;
  shellPickerOpen.value = true;
}

function chooseShell(shellId: string) {
  const item = items.value.find(
    entry => entry.itemId === selectedTokenId.value
  );
  if (!item || item.kind !== "token") return;
  delete item.flowerId;
  item.shellId = shellId;
  syncItem(item);
  shellPickerOpen.value = false;
}

function itemTextColor(backgroundColor: string) {
  const hex = backgroundColor.replace("#", "");
  const channels = [0, 2, 4].map(
    index => Number.parseInt(hex.slice(index, index + 2), 16) / 255
  );
  const luminance = channels
    .map(channel =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )
    .reduce(
      (sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!,
      0
    );
  return luminance < 0.4 ? "#fff" : "#3b3526";
}

function itemInputHoverBackground(
  backgroundColor: string,
  kind: TimelineItem["kind"]
) {
  return kind === "token" || itemTextColor(backgroundColor) !== "#fff"
    ? "rgb(255 255 255 / 90%)"
    : "rgb(0 0 0 / 45%)";
}

function fitNoteText(item: TimelineItem, value: string) {
  let text = value.slice(0, 2000);
  const textarea = Array.from(
    document.querySelectorAll<HTMLTextAreaElement>(
      ".timeline-item textarea.timeline-note-input"
    )
  ).find(
    element =>
      element.closest<HTMLElement>(".timeline-item")?.dataset.itemId ===
      item.itemId
  );
  if (!textarea) return text;

  textarea.value = text;
  while (text.length > 0 && textarea.scrollHeight > textarea.clientHeight) {
    text = text.slice(0, -1);
    textarea.value = text;
  }
  return text;
}

function updateNoteText(item: TimelineItem, value: string | number | null) {
  item.text = fitNoteText(item, String(value ?? ""));
  syncItem(item);
}

function updateTokenText(item: TimelineItem, value: string | number | null) {
  item.text = String(value ?? "").slice(0, 40);
  syncItem(item);
}

function noteConnectorStyle(item: TimelineItem) {
  const noteHeight = 140;
  const axisY = timelineY.value;
  const noteBottom = item.y + noteHeight;
  if (item.y >= axisY) {
    return {
      left: `${item.x + 100}px`,
      top: `${axisY}px`,
      height: `${item.y - axisY}px`
    };
  }
  return {
    left: `${item.x + 100}px`,
    top: `${noteBottom}px`,
    height: `${Math.max(0, axisY - noteBottom)}px`
  };
}

function removeItem(itemId: string) {
  props.sharedItems.delete(itemId);
  items.value = items.value.filter(item => item.itemId !== itemId);
}

onMounted(async () => {
  updateScrollViewport();
  if (scrollRef.value) {
    viewportObserver = new ResizeObserver(updateScrollViewport);
    viewportObserver.observe(scrollRef.value);
  }
  items.value = Array.from(props.sharedItems.values(), state => ({
    ...state
  }));
  updateScrollViewport();
  highestZIndex = items.value.reduce(
    (highest, item) => Math.max(highest, item.zIndex),
    0
  );
  itemObserver = event => {
    event.changes.keys.forEach((change, itemId) => {
      if (change.action === "delete") {
        items.value = items.value.filter(item => item.itemId !== itemId);
        return;
      }
      const state = props.sharedItems.get(itemId);
      if (!state) return;
      applyItemState(state);
      if (state.kind === "note") {
        void nextTick(() => {
          const item = items.value.find(entry => entry.itemId === itemId);
          if (!item || item.kind !== "note") return;
          const text = fitNoteText(item, item.text);
          if (text === item.text) return;
          item.text = text;
          syncItem(item);
        });
      }
    });
  };
  props.sharedItems.observe(itemObserver);

  await nextTick();
  items.value.forEach(item => {
    if (item.kind !== "note") return;
    const text = fitNoteText(item, item.text);
    if (text === item.text) return;
    item.text = text;
    syncItem(item);
  });
  interact(".timeline-item").draggable({
    inertia: false,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: "parent",
        endOnly: false
      })
    ],
    ignoreFrom: "input, textarea, button",
    listeners: {
      start(event) {
        const element = event.target as HTMLElement;
        const item = items.value.find(
          entry => entry.itemId === element.dataset.itemId
        );
        if (!item) return;
        draggingItemId.value = item.itemId;
        item.zIndex = ++highestZIndex;
        element.style.zIndex = String(item.zIndex);
        element.classList.add("is-dragging");
      },
      move(event) {
        const element = event.target as HTMLElement;
        const item = items.value.find(
          entry => entry.itemId === element.dataset.itemId
        );
        const x = Number.parseFloat(element.dataset.x ?? "0") + event.dx;
        const requestedY =
          Number.parseFloat(element.dataset.y ?? "0") + event.dy;
        const y = item?.kind === "note" ? clampNoteY(requestedY) : requestedY;
        element.dataset.x = String(x);
        element.dataset.y = String(y);
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      },
      end(event) {
        const element = event.target as HTMLElement;
        element.classList.remove("is-dragging");
        const item = items.value.find(
          entry => entry.itemId === element.dataset.itemId
        );
        draggingItemId.value = null;
        if (!item) return;
        item.x = Number.parseFloat(element.dataset.x ?? String(item.x));
        item.y = Number.parseFloat(element.dataset.y ?? String(item.y));
        syncItem(item);
      }
    }
  });
});

onUnmounted(() => {
  viewportObserver?.disconnect();
  interact(".timeline-item").unset();
  if (itemObserver) props.sharedItems.unobserve(itemObserver);
});
</script>

<style scoped>
.timeline-workspace {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at center, #e8dcc8 0%, #d9c8ad 100%);
}

.timeline-toolbar {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 76px;
  padding: 10px 18px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.timeline-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timeline-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: scroll;
  overflow-y: hidden;
}

.timeline-canvas {
  position: relative;
  height: 100%;
  min-height: 480px;
}

.timeline-axis {
  position: sticky;
  z-index: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: #6d5944;
  box-shadow: 0 1px 2px rgb(0 0 0 / 20%);
  pointer-events: none;
}

.timeline-item {
  position: absolute;
  top: 0;
  left: 0;
  touch-action: none;
  user-select: none;
  will-change: transform;
}

.timeline-token {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: 3px solid white;
  border-radius: 50%;
  color: white;
  box-shadow: 0 3px 8px rgb(0 0 0 / 28%);
}

.timeline-flower-image {
  width: 104px;
  height: 104px;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.timeline-token-group {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
}

.timeline-token-group :deep(.q-field) {
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  width: 120px;
  transform: translateX(-50%);
  border-radius: 4px;
  background: transparent;
  transition: background-color 120ms ease;
}

.timeline-token-group:hover :deep(.q-field),
.timeline-token-group:focus-within :deep(.q-field) {
  background: var(--input-hover-background);
}

.timeline-token-group :deep(.timeline-token-label) {
  width: 100%;
  padding: 2px 4px;
  color: #3b3526;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
  text-align: center !important;
  user-select: text;
}

.timeline-note {
  width: 200px;
}

.timeline-note-paper {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  height: 140px;
  padding: 18px 14px;
  overflow: visible;
  background: #fff3a6;
  box-shadow: 2px 5px 12px rgb(0 0 0 / 22%);
}

.timeline-note-connector {
  position: absolute;
  z-index: 0;
  width: 2px;
  background: #6d5944;
  pointer-events: none;
}

.timeline-note-input {
  height: 100px !important;
  min-height: 100px;
  max-height: 100px;
  overflow-y: auto;
  color: #3b3526;
  font-family: "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive;
  font-size: 18px;
  line-height: 1.4;
  user-select: text;
}

.timeline-note-paper :deep(.q-field) {
  border-radius: 4px;
  background: transparent;
  transition: background-color 120ms ease;
}

.timeline-note-paper:hover :deep(.q-field),
.timeline-note-paper:focus-within :deep(.q-field) {
  background: var(--input-hover-background);
}

.timeline-item-delete {
  position: absolute;
  top: -12px;
  right: -38px;
  z-index: 1;
  background: white;
  opacity: 0;
}

.timeline-item-color {
  position: absolute;
  top: -12px;
  right: 34px;
  z-index: 1;
  background: white;
  opacity: 0;
}

.timeline-note .timeline-item-delete {
  top: -12px;
  right: -12px;
}

.timeline-note .timeline-item-color {
  right: 22px;
}

.timeline-token-control.timeline-item-delete,
.timeline-token-control.timeline-item-color {
  top: 62px;
  right: auto;
}

.timeline-token-control.timeline-item-color {
  left: 50%;
  transform: translateX(calc(-100% - 4px));
}

.timeline-token-control.timeline-item-delete {
  left: 50%;
  transform: translateX(4px);
}

.flower-picker {
  width: min(680px, 94vw);
  max-height: 85vh;
}

.shell-picker {
  width: min(820px, 96vw);
  max-height: 92vh;
}

.flower-picker-scroll {
  height: min(60vh, 520px);
}

.shell-picker .flower-picker-scroll {
  box-sizing: border-box;
  height: min(68vh, 460px);
  padding: 20px 28px;
}

.flower-picker-row {
  display: flex;
  justify-content: center;
  gap: 4px;
  min-height: 72px;
}

.shell-picker-row {
  box-sizing: border-box;
  min-height: 120px;
  gap: 16px;
  padding: 10px 0;
}

.flower-picker-option {
  width: 72px;
  height: 72px;
}

.shell-picker-option {
  width: 104px;
  height: 104px;
}

.flower-picker-option img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.shell-picker-image {
  width: 64px !important;
  height: 64px !important;
  transform: rotate(37deg);
}

.timeline-color-picker {
  display: grid;
  grid-template-columns: repeat(4, 32px);
  gap: 8px;
  padding: 10px;
}

.timeline-color-picker-flower {
  grid-column: 1 / -1;
  justify-self: stretch;
}

.timeline-color-swatch {
  width: 28px;
  height: 28px;
  border: 1px solid rgb(0 0 0 / 16%);
}

.timeline-item:hover .timeline-item-color,
.timeline-item:focus-within .timeline-item-color,
.timeline-item.is-dragging .timeline-item-color,
.timeline-item:hover .timeline-item-delete,
.timeline-item:focus-within .timeline-item-delete,
.timeline-item.is-dragging .timeline-item-delete {
  opacity: 1;
}

.timeline-item.is-dragging {
  cursor: grabbing;
}

@media (max-width: 700px) {
  .timeline-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .timeline-toolbar-actions {
    flex-wrap: wrap;
  }
}
</style>
