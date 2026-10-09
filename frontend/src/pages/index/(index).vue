<template>
  <q-page class="flex flex-center deck-selection-page">
    <div class="deck-selection-container">
      <div class="text-h4 text-center q-mb-lg">Choose a Deck</div>
      <div v-if="createError" class="text-negative text-center q-mb-md">
        {{ createError }}
      </div>
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
              label="Create Table"
              no-caps
              :loading="creatingTable"
              @click="createTable(deck.id)"
            />
          </q-card-actions>
        </q-card>
      </div>

      <q-card class="join-table-card" flat bordered>
        <q-card-section class="text-center">
          <div class="text-h6 text-weight-bold">Join a Table</div>
          <div class="text-caption q-mt-sm">
            Enter the five-letter join code shared by the table creator.
          </div>
          <q-card-section class="q-pt-md">
            <q-input
              v-model="joinCode"
              dark
              outlined
              maxlength="5"
              label="Join code"
              input-class="text-uppercase"
              color="white"
              @update:model-value="normalizeJoinCode"
              @keyup.enter="joinTable"
            />
            <div v-if="joinError" class="text-negative q-mt-sm">
              {{ joinError }}
            </div>
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              color="primary"
              label="Join Table"
              no-caps
              icon="group"
              :disable="!isJoinCodeValid"
              @click="joinTable"
            />
          </q-card-actions>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { availableDecks } from "@/decks";
import { startConnection } from "@/services/signalr";

const router = useRouter();
const joinCode = ref("");
const joinError = ref("");
const createError = ref("");
const creatingTable = ref(false);
const isJoinCodeValid = computed(() => /^[A-Z]{5}$/.test(joinCode.value));

function normalizeJoinCode(value: string | number | null) {
  joinCode.value = String(value ?? "")
    .replace(/[^a-z]/gi, "")
    .toUpperCase()
    .slice(0, 5);
  joinError.value = "";
}

async function createTable(deckId: string) {
  creatingTable.value = true;
  createError.value = "";
  try {
    const connection = await startConnection();
    const code = await connection.invoke<string>("CreateTable", deckId);
    await router.push(`/table/${code}`);
  } catch (err) {
    console.error("Failed to create table:", err);
    createError.value = "Could not create a table. Please try again.";
  } finally {
    creatingTable.value = false;
  }
}

function joinTable() {
  if (!isJoinCodeValid.value) return;
  void router.push(`/table/${joinCode.value}`);
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
