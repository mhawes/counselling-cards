import type { Deck } from "./tarot-cats";

const suits = ["clubs", "diamonds", "hearts", "spades"] as const;
const ranks = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "jack",
  "queen",
  "king",
] as const;

function cardAlt(rank: string, suit: string) {
  const displayRank = rank === "ace" ? "Ace" : rank[0]?.toUpperCase() + rank.slice(1);
  const displaySuit = suit[0]?.toUpperCase() + suit.slice(1);
  return `${displayRank} of ${displaySuit}`;
}

export const playingCardsDeck: Deck = {
  id: "playing-cards",
  name: "Playing Cards",
  cardWidth: 166,
  cardHeight: 241,
  backImageUrl: "src/assets/playing-cards/back.png",
  cards: [
    ...suits.flatMap((suit) =>
      ranks.map((rank) => {
        const id = `${rank}_of_${suit}`;
        return {
          id,
          assetUrl: `src/assets/playing-cards/${id}.png`,
          alt: cardAlt(rank, suit),
        };
      }),
    ),
    {
      id: "red_joker",
      assetUrl: "src/assets/playing-cards/red_joker.png",
      alt: "Red Joker",
    },
    {
      id: "black_joker",
      assetUrl: "src/assets/playing-cards/black_joker.png",
      alt: "Black Joker",
    },
  ],
};
