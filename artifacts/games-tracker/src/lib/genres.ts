export const POPULAR_GENRES = [
  "Action",
  "Adventure",
  "RPG",
  "Strategy",
  "Simulation",
  "Sports",
  "Racing",
  "Puzzle",
  "Platformer",
  "Fighting",
  "Shooter",
  "Horror",
  "Stealth",
  "Survival",
  "Battle Royale",
  "MOBA",
  "MMO",
  "Roguelike",
  "Visual Novel",
  "Card Game",
  "Board Game",
  "Music",
  "Educational",
  "Indie",
  "Open World",
  "Sandbox",
  "Metroidvania",
  "Tower Defense",
  "Turn-Based",
  "Real-Time Strategy",
] as const;

export type Genre = (typeof POPULAR_GENRES)[number];

const CUSTOM_GENRES_KEY = "nexus-custom-genres";
const MAX_CUSTOM_GENRES = 50;

export function loadCustomGenres(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_GENRES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((g): g is string => typeof g === "string" && g.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function saveCustomGenre(genre: string): void {
  const trimmed = genre.trim();
  if (!trimmed || typeof window === "undefined") return;

  const isPopular = POPULAR_GENRES.some(
    (g) => g.toLowerCase() === trimmed.toLowerCase(),
  );
  if (isPopular) return;

  const existing = loadCustomGenres();
  const next = [
    trimmed,
    ...existing.filter((g) => g.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_CUSTOM_GENRES);

  try {
    window.localStorage.setItem(CUSTOM_GENRES_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function mergeGenreSuggestions(...sources: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (raw: string | null | undefined) => {
    const trimmed = raw?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  };

  for (const source of sources) {
    if (typeof source === "string") add(source);
  }

  for (const g of POPULAR_GENRES) add(g);
  for (const g of loadCustomGenres()) add(g);

  return result;
}

export function filterGenreSuggestions(query: string, allGenres: string[]): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return allGenres.slice(0, 8);

  const scored = allGenres
    .map((genre) => {
      const lower = genre.toLowerCase();
      if (lower === q) return { genre, rank: 0 };
      if (lower.startsWith(q)) return { genre, rank: 1 };
      if (lower.includes(q)) return { genre, rank: 2 };
      return null;
    })
    .filter((x): x is { genre: string; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank || a.genre.localeCompare(b.genre));

  return scored.map((s) => s.genre).slice(0, 8);
}
