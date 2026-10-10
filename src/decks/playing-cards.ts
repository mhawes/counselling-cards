import type { Deck } from "./tarot-cats";

const playingCardImages = import.meta.glob<string>(
  "../assets/playing-cards/*.png",
  { eager: true, query: "?url", import: "default" }
);

function getPlayingCardImage(filename: string): string {
  const imageUrl = playingCardImages[`../assets/playing-cards/${filename}`];
  if (!imageUrl) {
    throw new Error(`Missing playing card image: ${filename}`);
  }
  return imageUrl;
}

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
  "king"
] as const;

function cardAlt(rank: string, suit: string) {
  const displayRank =
    rank === "ace" ? "Ace" : rank[0]?.toUpperCase() + rank.slice(1);
  const displaySuit = suit[0]?.toUpperCase() + suit.slice(1);
  return `${displayRank} of ${displaySuit}`;
}

export const playingCardsDeck: Deck = {
  id: "playing-cards",
  name: "Playing Cards",
  cardWidth: 160,
  cardHeight: 235,
  backImageUrl: getPlayingCardImage("back.png"),
  cards: [
    ...suits.flatMap(suit =>
      ranks.map(rank => {
        const id = `${rank}_of_${suit}`;
        return {
          id,
          assetUrl: getPlayingCardImage(`${id}.png`),
          alt: cardAlt(rank, suit)
        };
      })
    ),
    {
      id: "red_joker",
      assetUrl: getPlayingCardImage("red_joker.png"),
      alt: "Red Joker"
    },
    {
      id: "black_joker",
      assetUrl: getPlayingCardImage("black_joker.png"),
      alt: "Black Joker"
    }
  ]
};
