export const DECKS = {
  fibonacci: {
    label: "Fibonacci 🐰",
    cards: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"],
  },
  modified: {
    label: "Modifié 🐨",
    cards: ["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
  },
  tshirt: {
    label: "T-shirts 🐼",
    cards: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
  },
  powers: {
    label: "Puissances de 2 🦉",
    cards: ["1", "2", "4", "8", "16", "32", "64", "?", "☕"],
  },
} as const;

export type DeckKey = keyof typeof DECKS;

export const DECK_KEYS = Object.keys(DECKS) as DeckKey[];

export function getDeck(key: string) {
  return DECKS[(key as DeckKey) in DECKS ? (key as DeckKey) : "fibonacci"];
}

export const ANIMALS = [
  "🦊",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐸",
  "🐵",
  "🐷",
  "🐧",
  "🐰",
  "🐢",
  "🦉",
  "🐙",
  "🦄",
  "🐳",
  "🐝",
  "🦔",
  "🐬",
];

export const CARD_STYLES: Record<string, string> = {
  "0": "from-sky-200 to-sky-300",
  "0.5": "from-sky-200 to-indigo-300",
  "1": "from-emerald-200 to-emerald-300",
  "2": "from-lime-200 to-emerald-300",
  "3": "from-amber-200 to-amber-300",
  "4": "from-amber-200 to-orange-300",
  "5": "from-orange-200 to-orange-300",
  "8": "from-rose-200 to-rose-300",
  "13": "from-pink-200 to-pink-300",
  "16": "from-pink-200 to-fuchsia-300",
  "20": "from-fuchsia-200 to-fuchsia-300",
  "21": "from-fuchsia-200 to-purple-300",
  "32": "from-purple-200 to-purple-300",
  "34": "from-violet-200 to-violet-300",
  "40": "from-violet-200 to-indigo-300",
  "55": "from-indigo-200 to-indigo-300",
  "64": "from-indigo-200 to-blue-300",
  "89": "from-blue-200 to-blue-300",
  "100": "from-blue-200 to-cyan-300",
  "?": "from-slate-200 to-slate-300",
  "☕": "from-amber-100 to-yellow-200",
  XS: "from-sky-200 to-sky-300",
  S: "from-emerald-200 to-emerald-300",
  M: "from-amber-200 to-amber-300",
  L: "from-orange-200 to-orange-300",
  XL: "from-rose-200 to-rose-300",
  XXL: "from-purple-200 to-purple-300",
};

export function cardStyle(value: string) {
  return CARD_STYLES[value] ?? "from-slate-200 to-slate-300";
}

export type ParticipantView = {
  id: number;
  name: string;
  avatar: string;
  vote: string | null;
  isCreator: boolean;
  isOwner: boolean;
};

export type RoomView = {
  code: string;
  name: string;
  storyTitle: string;
  storyUrl: string;
  deck: DeckKey;
  revealed: boolean;
  round: number;
  createdAt: string;
  participants: ParticipantView[];
  stats: {
    votedCount: number;
    totalCount: number;
    average: number | null;
    min: string | null;
    max: string | null;
    consensus: boolean;
    suggestion: string | null;
    coffeeCount: number;
    questionCount: number;
  };
};

export function computeStats(participants: ParticipantView[], deck: DeckKey) {
  const votes = participants.map((p) => p.vote).filter((v): v is string => !!v);
  const numerics = votes
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  const votedCount = votes.length;
  const totalCount = participants.length;

  const average =
    numerics.length > 0
      ? Math.round((numerics.reduce((a, b) => a + b, 0) / numerics.length) * 10) / 10
      : null;

  const allSame = votedCount > 0 && votes.every((v) => v === votes[0]);
  const numericCards = getDeck(deck).cards
    .map((c) => Number(c))
    .filter((n) => Number.isFinite(n));

  let suggestion: string | null = null;
  if (average !== null && numericCards.length > 0) {
    let closest = numericCards[0];
    for (const c of numericCards) {
      const diff = Math.abs(c - average);
      const best = Math.abs(closest - average);
      // On privilégie la carte supérieure en cas d'égalité (on arrondit au-dessus).
      if (diff < best || (diff === best && c > closest)) closest = c;
    }
    suggestion = String(closest);
  }

  return {
    votedCount,
    totalCount,
    average,
    min: numerics.length ? String(Math.min(...numerics)) : null,
    max: numerics.length ? String(Math.max(...numerics)) : null,
    consensus: allSame,
    suggestion,
    coffeeCount: votes.filter((v) => v === "☕").length,
    questionCount: votes.filter((v) => v === "?").length,
  };
}

export function friendlyRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function publicToken() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
