const tarotCatImages = import.meta.glob<string>(
  "../assets/tarot-cats/*.{png,jpg}",
  { eager: true, query: "?url", import: "default" }
);

function getTarotCatImage(filename: string): string {
  const imageUrl = tarotCatImages[`../assets/tarot-cats/${filename}`];
  if (!imageUrl) {
    throw new Error(`Missing tarot card image: ${filename}`);
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

export const tarotCatsDeck: Deck = {
  id: "tarot-cats",
  name: "Tarot Cats",
  cardWidth: 166,
  cardHeight: 288,
  backImageUrl: getTarotCatImage("back2.jpg"),
  cards: [
    {
      id: "card-1",
      assetUrl: getTarotCatImage("0. The Fool.png"),
      alt: "The Fool"
    },
    {
      id: "card-2",
      assetUrl: getTarotCatImage("1. The Magician.png"),
      alt: "The Magician"
    },
    {
      id: "card-3",
      assetUrl: getTarotCatImage("2. The Priestess.png"),
      alt: "The Priestess"
    },
    {
      id: "card-4",
      assetUrl: getTarotCatImage("3. The Empress.png"),
      alt: "The Empress"
    },
    {
      id: "card-5",
      assetUrl: getTarotCatImage("4. The Emperor.png"),
      alt: "The Emperor"
    },
    {
      id: "card-6",
      assetUrl: getTarotCatImage("5. The Hierophant.png"),
      alt: "The Hierophant"
    },
    {
      id: "card-7",
      assetUrl: getTarotCatImage("6. The Lovers.png"),
      alt: "The Lovers"
    },
    {
      id: "card-8",
      assetUrl: getTarotCatImage("7. The Chariot.png"),
      alt: "The Chariot"
    },
    {
      id: "card-9",
      assetUrl: getTarotCatImage("8. Justice.png"),
      alt: "Justice"
    },
    {
      id: "card-10",
      assetUrl: getTarotCatImage("9. The Hermit.png"),
      alt: "The Hermit"
    },
    {
      id: "card-11",
      assetUrl: getTarotCatImage("10. Wheel of Fortune.png"),
      alt: "Wheel of Fortune"
    },
    {
      id: "card-12",
      assetUrl: getTarotCatImage("11. Strength.png"),
      alt: "Strength"
    },
    {
      id: "card-13",
      assetUrl: getTarotCatImage("12. The Hanged Man.png"),
      alt: "The Hanged Man"
    },
    {
      id: "card-14",
      assetUrl: getTarotCatImage("13. Death.png"),
      alt: "Death"
    },
    {
      id: "card-15",
      assetUrl: getTarotCatImage("14. Temperance.png"),
      alt: "Temperance"
    },
    {
      id: "card-16",
      assetUrl: getTarotCatImage("15. The Devil.png"),
      alt: "The Devil"
    },
    {
      id: "card-17",
      assetUrl: getTarotCatImage("16. The Star.png"),
      alt: "The Star"
    },
    {
      id: "card-18",
      assetUrl: getTarotCatImage("17. The Tower.png"),
      alt: "The Tower"
    },
    {
      id: "card-19",
      assetUrl: getTarotCatImage("18. The Moon.png"),
      alt: "The Moon"
    },
    {
      id: "card-20",
      assetUrl: getTarotCatImage("19. The Sun.png"),
      alt: "The Sun"
    },
    {
      id: "card-21",
      assetUrl: getTarotCatImage("20. Judgement.png"),
      alt: "Judgement"
    },
    {
      id: "card-22",
      assetUrl: getTarotCatImage("21. The World.png"),
      alt: "The World"
    }
  ]
};
