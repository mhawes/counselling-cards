import type { Deck } from "./tarot-cats";

const mysticalArchetypeImages = import.meta.glob<string>(
  ["../assets/archetype-cards2/*.png"],
  { eager: true, query: "?url", import: "default" }
);

function getMysticalArchetypeImage(filename: string): string {
  const imageUrl =
    mysticalArchetypeImages[`../assets/archetype-cards2/${filename}`];
  if (!imageUrl) {
    throw new Error(`Missing mystical archetype image: ${filename}`);
  }
  return imageUrl;
}

const archetypes = [
  "The Innocent",
  "The Outlaw",
  "The Warrior",
  "The Caregiver",
  "The Lover",
  "The Creator",
  "The Ruler",
  "The Jester",
  "The Sage",
  "The Magician",
  "The Shadow",
  "The Self",
  "The Explorer",
  "The Everyman"
] as const;

export const mysticalArchetypesDeck: Deck = {
  id: "mystical-archetypes",
  name: "Archetypes",
  cardWidth: 145,
  cardHeight: 298,
  backImageUrl: getMysticalArchetypeImage("back.png"),
  cards: [
    ...archetypes.map(name => ({
      id: name.toLowerCase().replaceAll(" ", "-"),
      assetUrl: getMysticalArchetypeImage(`${name}.png`),
      alt: name
    })),
    {
      id: "the-animus-anima",
      assetUrl: getMysticalArchetypeImage("The Animus and Anima.png"),
      alt: "The Animus / Anima"
    },
    {
      id: "the-persona",
      assetUrl: getMysticalArchetypeImage("The Persona.png"),
      alt: "The Persona"
    }
  ]
};
