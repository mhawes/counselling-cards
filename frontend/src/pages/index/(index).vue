<template>
  <q-page class="flex flex-center deck-selection-page">
    <div class="deck-selection-container">
      <div class="text-h4 text-center q-mb-lg">Choose a Deck</div>
      <div class="deck-grid">
        <q-card
          v-for="deck in availableDecks"
          :key="deck.id"
          class="deck-card"
          flat
          bordered
          :style="{ backgroundImage: `url(${deck.backImageUrl})` }"
        >
          <q-card-section class="text-center">
            <div class="text-h6 text-weight-bold text-white">
              {{ deck.name }}
            </div>
            <div class="text-caption text-white q-mt-sm">
              {{ deck.cards.length }} cards
            </div>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              color="secondary"
              :to="`/table/${deck.id}`"
              label="Use Deck"
              no-caps
            />
          </q-card-actions>
        </q-card>
      </div>

      <q-card class="join-table-card" flat bordered>
        <q-card-section class="text-center">
          <div class="text-h6 text-weight-bold">
            Join a Table
          </div>
          <div class="text-caption q-mt-sm">
            Join an existing shared table so you can see and move cards in real time.
          </div>
          <q-card-actions align="center" class="q-mt-md">
            <q-dialog v-model="showTablePicker">
              <q-card style="min-width: 300px">
                <q-card-section>
                  <div class="text-h6">Active Tables</div>
                </q-card-section>
                <q-card-section v-if="loadingTables">
                  <q-spinner color="primary" size="32px" class="self-center" />
                </q-card-section>
                <q-card-section v-else-if="activeTables.length === 0">
                  <div class="text-grey">
                    No active tables. Open a deck to start one.
                  </div>
                </q-card-section>
                <q-card-section v-else>
                  <q-btn
                    v-for="table in activeTables"
                    :key="table.tableId"
                    class="q-mb-sm"
                    unelevated
                    color="primary"
                    text-color="white"
                    :label="`${table.deckName} (${table.connections} connected)`"
                    no-caps
                    @click="joinTable(table.tableId)"
                    style="width: 100%"
                  />
                </q-card-section>
              </q-card>
            </q-dialog>

            <q-btn
              color="primary"
              label="Join Table"
              no-caps
              icon="group"
              @click="loadActiveTables"
            />
          </q-card-actions>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { availableDecks, getDeckById } from "@/decks";

const router = useRouter();
const showTablePicker = ref(false);
const loadingTables = ref(false);
const activeTables = ref<Array<{ tableId: string; deckName: string; connections: number }>>([]);

const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL ?? "http://localhost:5271";

async function loadActiveTables() {
  loadingTables.value = true;
  showTablePicker.value = true;
  try {
    const response = await fetch(`${SIGNALR_URL}/api/tables`);
    if (!response.ok) throw new Error("Failed to fetch tables");
    const tables: Record<string, number> = await response.json();

    activeTables.value = Object.entries(tables)
      .map(([tableId, connections]) => {
        const deck = getDeckById(tableId);
        return {
          tableId,
          deckName: deck ? deck.name : tableId,
          connections,
        };
      })
      .sort((a, b) => b.connections - a.connections);
  } catch (err) {
    console.warn("Failed to load active tables:", err);
    activeTables.value = [];
  } finally {
    loadingTables.value = false;
  }
}

function joinTable(tableId: string) {
  showTablePicker.value = false;
  router.push(`/table/${tableId}`);
}
</script>

<style scoped>
.deck-selection-page {
  min-height: 70vh;

  background: radial-gradient(circle at center, #e8dcc8 0%, #d9c8ad 100%);
}

.deck-selection-container {
  max-width: 600px;

  width: 100%;

  padding: 24px;
}

.deck-grid {
  display: grid;

  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.deck-card {
  transition: box-shadow 120ms ease;

  cursor: pointer;

  background-size: cover;

  background-position: center;

  background-repeat: no-repeat;
}

.deck-card:hover {
  box-shadow:
    0 4px 8px rgb(0 0 0 / 12%),
    0 10px 24px rgb(0 0 0 / 15%);
}

.join-table-card {
  margin-top: 24px;

  transition: box-shadow 120ms ease;

  cursor: pointer;

  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  color: white;
}

.join-table-card:hover {
  box-shadow:
    0 4px 8px rgb(0 0 0 / 12%),
    0 10px 24px rgb(0 0 0 / 15%);
}
</style>
