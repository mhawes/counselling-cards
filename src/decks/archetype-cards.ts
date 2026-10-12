const archetypeCardImages = import.meta.glob<string>(
  "../assets/archetype-cards/*.{jpg,JPG,png,PNG}",
  { eager: true, query: "?url", import: "default" }
);

function getArchetypeCardImage(filename: string): string {
  const imageUrl = archetypeCardImages[`../assets/archetype-cards/${filename}`];
  if (!imageUrl) {
    throw new Error(`Missing archetype card image: ${filename}`);
  }
  return imageUrl;
}

export interface DeckCard {
  id: string;
  assetUrl: string;
  alt: string;
}

export interface Deck {
  id: string;
  name: string;
  cardWidth: number;
  cardHeight: number;
  backImageUrl: string;
  cards: DeckCard[];
}

const archetypeCardDefinitions = [
  { id: "advocate", filename: "Advocate.jpg", alt: "Advocate" },
  { id: "child-divine", filename: "Child_Divine.jpg", alt: "Child Divine" },
  { id: "child-wounded", filename: "Child_Wounded.jpg", alt: "Child Wounded" },
  { id: "damsel", filename: "Damsel.jpg", alt: "Damsel" },
  { id: "don-juan", filename: "Don Juan.jpg", alt: "Don Juan" },
  { id: "fool", filename: "Fool.jpg", alt: "Fool" },
  { id: "hero-heroine", filename: "Hero_Heroine.jpg", alt: "Hero Heroine" },
  { id: "liberator", filename: "Liberator.jpg", alt: "Liberator" },
  { id: "martyr", filename: "Martyr.jpg", alt: "Martyr" },
  { id: "monk-nun", filename: "Monk Nun.jpg", alt: "Monk Nun" },
  { id: "mystic", filename: "Mystic.jpg", alt: "Mystic" },
  { id: "queen", filename: "Queen.jpg", alt: "Queen" },
  { id: "seeker", filename: "Seeker.jpg", alt: "Seeker" },
  { id: "servant", filename: "Servant.jpg", alt: "Servant" },
  { id: "shape-shifter", filename: "Shape-Shifter.jpg", alt: "Shape Shifter" },
  { id: "victim", filename: "Victim.jpg", alt: "Victim" }
] as const;

export const archetypeCardsDeck: Deck = {
  id: "archetype-cards",
  name: "Archetype Cards",
  cardWidth: 185,
  cardHeight: 295,
  backImageUrl: getArchetypeCardImage("back.png"),
  cards: archetypeCardDefinitions.map(({ id, filename, alt }) => ({
    id,
    assetUrl: getArchetypeCardImage(filename),
    alt
  }))
};
