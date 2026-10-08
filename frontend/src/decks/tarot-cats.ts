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
  backImageUrl: "src/assets/tarot-cats/back2.jpg",
  cards: [
    {
      id: "card-1",
      assetUrl: "src/assets/tarot-cats/0. The Fool.png",
      alt: "The Fool",
    },
    {
      id: "card-2",
      assetUrl: "src/assets/tarot-cats/1. The Magician.png",
      alt: "The Magician",
    },
    {
      id: "card-3",
      assetUrl: "src/assets/tarot-cats/2. The Priestess.png",
      alt: "The Priestess",
    },
    {
      id: "card-4",
      assetUrl: "src/assets/tarot-cats/3. The Empress.png",
      alt: "The Empress",
    },
    {
      id: "card-5",
      assetUrl: "src/assets/tarot-cats/4. The Emperor.png",
      alt: "The Emperor",
    },
    {
      id: "card-6",
      assetUrl: "src/assets/tarot-cats/5. The Hierophant.png",
      alt: "The Hierophant",
    },
    {
      id: "card-7",
      assetUrl: "src/assets/tarot-cats/6. The Lovers.png",
      alt: "The Lovers",
    },
    {
      id: "card-8",
      assetUrl: "src/assets/tarot-cats/7. The Chariot.png",
      alt: "The Chariot",
    },
    {
      id: "card-9",
      assetUrl: "src/assets/tarot-cats/8. Justice.png",
      alt: "Justice",
    },
    {
      id: "card-10",
      assetUrl: "src/assets/tarot-cats/9. The Hermit.png",
      alt: "The Hermit",
    },
    {
      id: "card-11",
      assetUrl: "src/assets/tarot-cats/10. Wheel of Fortune.png",
      alt: "Wheel of Fortune",
    },
    {
      id: "card-12",
      assetUrl: "src/assets/tarot-cats/11. Strength.png",
      alt: "Strength",
    },
    {
      id: "card-13",
      assetUrl: "src/assets/tarot-cats/12. The Hanged Man.png",
      alt: "The Hanged Man",
    },
    {
      id: "card-14",
      assetUrl: "src/assets/tarot-cats/13. Death.png",
      alt: "Death",
    },
    {
      id: "card-15",
      assetUrl: "src/assets/tarot-cats/14. Temperance.png",
      alt: "Temperance",
    },
    {
      id: "card-16",
      assetUrl: "src/assets/tarot-cats/15. The Devil.png",
      alt: "The Devil",
    },
    {
      id: "card-17",
      assetUrl: "src/assets/tarot-cats/16. The Star.png",
      alt: "The Star",
    },
    {
      id: "card-18",
      assetUrl: "src/assets/tarot-cats/17. The Tower.png",
      alt: "The Tower",
    },
    {
      id: "card-19",
      assetUrl: "src/assets/tarot-cats/18. The Moon.png",
      alt: "The Moon",
    },
    {
      id: "card-20",
      assetUrl: "src/assets/tarot-cats/19. The Sun.png",
      alt: "The Sun",
    },
    {
      id: "card-21",
      assetUrl: "src/assets/tarot-cats/20. Judgement.png",
      alt: "Judgement",
    },
    {
      id: "card-22",
      assetUrl: "src/assets/tarot-cats/21. The World.png",
      alt: "The World",
    },
  ],
};
