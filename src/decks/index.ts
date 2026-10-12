import type { Deck } from "./tarot-cats";
import { tarotCatsDeck } from "./tarot-cats";
import { playingCardsDeck } from "./playing-cards";
import { mysticalArchetypesDeck } from "./mystical-archetypes";

export type { Deck, DeckCard } from "./tarot-cats";

export const availableDecks: Deck[] = [
  tarotCatsDeck,
  mysticalArchetypesDeck,
  playingCardsDeck
];

export function getDeckById(id: string): Deck | undefined {
  return availableDecks.find(deck => deck.id === id);
}
