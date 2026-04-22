import { Router, type IRouter } from "express";
import { db, gamesTable, type GameRow } from "@workspace/db";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  CreateGameBody,
  UpdateGameBody,
  UpdateGameParams,
  GetGameParams,
  DeleteGameParams,
  ListGamesQueryParams,
} from "@workspace/api-zod";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

router.get("/games/cover-search", async (req, res) => {
  const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
  if (!title) {
    res.json({ coverUrl: null, title: null, steamAppId: null });
    return;
  }
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=us`;
    const r = await fetch(url, { headers: { "User-Agent": "GamesTracker/1.0" } });
    if (!r.ok) {
      res.json({ coverUrl: null, title: null, steamAppId: null });
      return;
    }
    const data = (await r.json()) as { items?: Array<{ id: number; name: string; tiny_image?: string }> };
    const first = data.items?.[0];
    if (!first) {
      res.json({ coverUrl: null, title: null, steamAppId: null });
      return;
    }
    const coverUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/library_600x900.jpg`;
    res.json({ coverUrl, title: first.name, steamAppId: first.id });
  } catch {
    res.json({ coverUrl: null, title: null, steamAppId: null });
  }
});

function extractSteamAppId(row: GameRow): number | null {
  if (row.steamAppId) return row.steamAppId;
  if (!row.coverUrl) return null;
  const match = row.coverUrl.match(/\/steam\/apps\/(\d+)\//);
  return match ? Number(match[1]) : null;
}

type SteamAppDetailsResponse = Record<
  string,
  {
    success: boolean;
    data?: {
      achievements?: {
        total: number;
        highlighted?: Array<{ name: string; path: string }>;
      };
    };
  }
>;

async function fetchSteamAchievements(appId: number) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&filters=achievements,basic`;
  const r = await fetch(url, { headers: { "User-Agent": "GamesTracker/1.0" } });
  if (!r.ok) return null;
  const data = (await r.json()) as SteamAppDetailsResponse;
  const entry = data[String(appId)];
  if (!entry?.success || !entry.data?.achievements) return null;
  return entry.data.achievements;
}

router.get("/games/:id/achievements", async (req, res) => {
  const { id } = GetGameParams.parse(req.params);
  const [row] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!row) {
    res.status(404).json({ message: "Game not found" });
    return;
  }
  const earned = new Set(row.earnedAchievements ?? []);
  const appId = extractSteamAppId(row);
  if (!appId) {
    res.json({
      steamAppId: null,
      total: 0,
      earnedCount: earned.size,
      achievements: [],
      source: "none",
    });
    return;
  }

  const ach = await fetchSteamAchievements(appId);
  if (!ach || !ach.highlighted || ach.highlighted.length === 0) {
    res.json({
      steamAppId: appId,
      total: ach?.total ?? 0,
      earnedCount: earned.size,
      achievements: [],
      source: "steam",
    });
    return;
  }

  const achievements = ach.highlighted.map((a) => ({
    name: a.name,
    displayName: a.name,
    description: null,
    iconUrl: a.path,
    earned: earned.has(a.name),
  }));

  res.json({
    steamAppId: appId,
    total: ach.total ?? achievements.length,
    earnedCount: achievements.filter((a) => a.earned).length,
    achievements,
    source: "steam",
  });
});

router.post("/games/:id/achievements", async (req, res) => {
  const { id } = GetGameParams.parse(req.params);
  const name = typeof req.body?.name === "string" ? req.body.name : null;
  const earnedFlag = req.body?.earned === true;
  if (!name) {
    res.status(400).json({ message: "name is required" });
    return;
  }
  const [row] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!row) {
    res.status(404).json({ message: "Game not found" });
    return;
  }
  const set = new Set(row.earnedAchievements ?? []);
  if (earnedFlag) set.add(name);
  else set.delete(name);
  const next = Array.from(set);

  await db
    .update(gamesTable)
    .set({ earnedAchievements: next, updatedAt: new Date() })
    .where(eq(gamesTable.id, id));

  const appId = extractSteamAppId(row);
  if (!appId) {
    res.json({
      steamAppId: null,
      total: 0,
      earnedCount: next.length,
      achievements: [],
      source: "none",
    });
    return;
  }
  const ach = await fetchSteamAchievements(appId);
  const earnedSet = new Set(next);
  const achievements = (ach?.highlighted ?? []).map((a) => ({
    name: a.name,
    displayName: a.name,
    description: null,
    iconUrl: a.path,
    earned: earnedSet.has(a.name),
  }));
  res.json({
    steamAppId: appId,
    total: ach?.total ?? achievements.length,
    earnedCount: achievements.filter((a) => a.earned).length,
    achievements,
    source: "steam",
  });
});

type GameDto = {
  id: string;
  title: string;
  platform: string | null;
  genre: string | null;
  status: "played" | "playing" | "halted";
  rating: number | null;
  coverUrl: string | null;
  notes: string | null;
  hoursPlayed: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  steamAppId: number | null;
  earnedAchievements: string[];
  createdAt: string;
  updatedAt: string;
};

function toDto(row: GameRow): GameDto {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    genre: row.genre,
    status: row.status as "played" | "playing" | "halted",
    rating: row.rating,
    coverUrl: row.coverUrl,
    notes: row.notes,
    hoursPlayed: row.hoursPlayed,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    steamAppId: row.steamAppId ?? extractSteamAppId(row),
    earnedAchievements: row.earnedAchievements ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDateString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return undefined;
}

router.get("/games/stats", async (_req, res) => {
  const rows = await db.select().from(gamesTable);

  const total = rows.length;
  const played = rows.filter((r) => r.status === "played").length;
  const playing = rows.filter((r) => r.status === "playing").length;
  const halted = rows.filter((r) => r.status === "halted").length;
  const totalHours = rows.reduce((s, r) => s + (r.hoursPlayed ?? 0), 0);
  const ratings = rows.map((r) => r.rating).filter((r): r is number => r != null);
  const averageRating =
    ratings.length > 0
      ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2))
      : null;

  const genreMap = new Map<string, number>();
  const platformMap = new Map<string, number>();
  for (const r of rows) {
    if (r.genre) genreMap.set(r.genre, (genreMap.get(r.genre) ?? 0) + 1);
    if (r.platform)
      platformMap.set(r.platform, (platformMap.get(r.platform) ?? 0) + 1);
  }
  const topGenres = [...genreMap.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topPlatforms = [...platformMap.entries()]
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    total,
    played,
    playing,
    halted,
    totalHours: Number(totalHours.toFixed(2)),
    averageRating,
    topGenres,
    topPlatforms,
  });
});

router.get("/games/recent", async (_req, res) => {
  const rows = await db
    .select()
    .from(gamesTable)
    .orderBy(desc(gamesTable.updatedAt))
    .limit(8);
  res.json(rows.map(toDto));
});

router.get("/games", async (req, res) => {
  const params = ListGamesQueryParams.parse(req.query);
  const conditions = [];
  if (params.status) conditions.push(eq(gamesTable.status, params.status));
  if (params.search) conditions.push(ilike(gamesTable.title, `%${params.search}%`));

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(gamesTable)
          .where(and(...conditions))
          .orderBy(desc(gamesTable.updatedAt))
      : await db.select().from(gamesTable).orderBy(desc(gamesTable.updatedAt));

  res.json(rows.map(toDto));
});

router.post("/games", async (req, res) => {
  const body = CreateGameBody.parse(req.body);
  const id = randomUUID();
  const now = new Date();
  const [row] = await db
    .insert(gamesTable)
    .values({
      id,
      title: body.title,
      platform: body.platform ?? null,
      genre: body.genre ?? null,
      status: body.status,
      rating: body.rating ?? null,
      coverUrl: body.coverUrl ?? null,
      notes: body.notes ?? null,
      hoursPlayed: body.hoursPlayed ?? null,
      startedAt: toDateString(body.startedAt) ?? null,
      finishedAt: toDateString(body.finishedAt) ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  res.status(201).json(toDto(row));
});

router.get("/games/:id", async (req, res) => {
  const { id } = GetGameParams.parse(req.params);
  const [row] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
  if (!row) {
    res.status(404).json({ message: "Game not found" });
    return;
  }
  res.json(toDto(row));
});

router.patch("/games/:id", async (req, res) => {
  const { id } = UpdateGameParams.parse(req.params);
  const body = UpdateGameBody.parse(req.body);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = body.title;
  if (body.platform !== undefined) update.platform = body.platform;
  if (body.genre !== undefined) update.genre = body.genre;
  if (body.status !== undefined) update.status = body.status;
  if (body.rating !== undefined) update.rating = body.rating;
  if (body.coverUrl !== undefined) update.coverUrl = body.coverUrl;
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.hoursPlayed !== undefined) update.hoursPlayed = body.hoursPlayed;
  if (body.startedAt !== undefined) update.startedAt = toDateString(body.startedAt);
  if (body.finishedAt !== undefined) update.finishedAt = toDateString(body.finishedAt);

  const [row] = await db
    .update(gamesTable)
    .set(update)
    .where(eq(gamesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ message: "Game not found" });
    return;
  }
  res.json(toDto(row));
});

router.delete("/games/:id", async (req, res) => {
  const { id } = DeleteGameParams.parse(req.params);
  const result = await db.delete(gamesTable).where(eq(gamesTable.id, id));
  void sql; // keep import minimal
  void result;
  res.status(204).end();
});

export default router;
