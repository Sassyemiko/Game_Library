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

type GameDto = {
  id: string;
  title: string;
  platform: string | null;
  genre: string | null;
  status: "played" | "playing" | "backlog";
  rating: number | null;
  coverUrl: string | null;
  notes: string | null;
  hoursPlayed: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: GameRow): GameDto {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    genre: row.genre,
    status: row.status as "played" | "playing" | "backlog",
    rating: row.rating,
    coverUrl: row.coverUrl,
    notes: row.notes,
    hoursPlayed: row.hoursPlayed,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
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
  const backlog = rows.filter((r) => r.status === "backlog").length;
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
    backlog,
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
