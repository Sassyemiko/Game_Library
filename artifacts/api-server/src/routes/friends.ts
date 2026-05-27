import { Router, type IRouter, type Request } from "express";
import { and, eq, inArray, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  friendshipsTable,
  gamesTable,
  usersTable,
  type GameRow,
  type UserRow,
} from "@workspace/db";
import { GUEST_USER_ID, getRequestUserId } from "../lib/auth";
import { displayLabel, ensureUserProfile } from "../lib/users";

const router: IRouter = Router();

function userIdFrom(req: Request): string {
  const userId = getRequestUserId(req);
  if (!userId || userId === GUEST_USER_ID) {
    throw new Error("FORBIDDEN");
  }
  return userId;
}

function gameKey(row: GameRow): string {
  if (row.steamAppId) return `steam:${row.steamAppId}`;
  return `title:${row.title.trim().toLowerCase()}`;
}

type GameSummary = {
  id: string;
  title: string;
  coverUrl: string | null;
  platform: string | null;
  status: string;
  rating: number | null;
  hoursPlayed: number | null;
  earnedAchievements: string[];
  steamAppId: number | null;
};

function toGameSummary(row: GameRow): GameSummary {
  return {
    id: row.id,
    title: row.title,
    coverUrl: row.coverUrl,
    platform: row.platform,
    status: row.status,
    rating: row.rating,
    hoursPlayed: row.hoursPlayed,
    earnedAchievements: row.earnedAchievements ?? [],
    steamAppId: row.steamAppId,
  };
}

async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ friendId: friendshipsTable.friendId })
    .from(friendshipsTable)
    .where(eq(friendshipsTable.userId, userId));
  return rows.map((r) => r.friendId);
}

async function getFriendsWithProfiles(userId: string) {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  const profiles = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, friendIds));

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return friendIds
    .map((id) => profileMap.get(id))
    .filter((p): p is UserRow => !!p)
    .map((p) => ({
      id: p.id,
      referralCode: p.referralCode,
      displayName: displayLabel(p),
    }));
}

router.get("/friends/profile", async (req, res) => {
  try {
    const userId = userIdFrom(req);
    const profile = await ensureUserProfile(userId);
    const friendIds = await getFriendIds(userId);

    res.json({
      id: profile.id,
      referralCode: profile.referralCode,
      displayName: displayLabel(profile),
      friendCount: friendIds.length,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      res.status(403).json({ message: "Sign in to use friends and recommendations" });
      return;
    }
    res.status(500).json({ message: "Failed to load profile" });
  }
});

router.patch("/friends/profile", async (req, res) => {
  try {
    const userId = userIdFrom(req);
    const rawDisplayName = typeof req.body?.displayName === "string" ? req.body.displayName : "";
    const displayName = rawDisplayName.trim();

    if (!displayName) {
      res.status(400).json({ message: "Nickname is required" });
      return;
    }

    if (displayName.length > 32) {
      res.status(400).json({ message: "Nickname must be 32 characters or fewer" });
      return;
    }

    await ensureUserProfile(userId);
    const [updated] = await db
      .update(usersTable)
      .set({ displayName })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const friendIds = await getFriendIds(userId);
    res.json({
      id: updated.id,
      referralCode: updated.referralCode,
      displayName: displayLabel(updated),
      friendCount: friendIds.length,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      res.status(403).json({ message: "Sign in to use friends and recommendations" });
      return;
    }
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.post("/friends/invite", async (req, res) => {
  try {
    const userId = userIdFrom(req);
    const code =
      typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";

    if (!code) {
      res.status(400).json({ message: "Referral code is required" });
      return;
    }

    await ensureUserProfile(userId);

    const [friend] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, code));

    if (!friend) {
      res.status(404).json({ message: "Invalid referral code" });
      return;
    }

    if (friend.id === userId) {
      res.status(400).json({ message: "You cannot add yourself" });
      return;
    }

    const [already] = await db
      .select()
      .from(friendshipsTable)
      .where(
        and(
          eq(friendshipsTable.userId, userId),
          eq(friendshipsTable.friendId, friend.id),
        ),
      );

    if (already) {
      res.status(409).json({ message: "Already friends" });
      return;
    }

    const now = new Date();
    await db.insert(friendshipsTable).values([
      { id: randomUUID(), userId, friendId: friend.id, createdAt: now },
      { id: randomUUID(), userId: friend.id, friendId: userId, createdAt: now },
    ]);

    res.status(201).json({
      friend: {
        id: friend.id,
        referralCode: friend.referralCode,
        displayName: displayLabel(friend),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      res.status(403).json({ message: "Sign in to use friends and recommendations" });
      return;
    }
    res.status(500).json({ message: "Failed to add friend" });
  }
});

router.get("/friends", async (req, res) => {
  try {
    const userId = userIdFrom(req);
    const friends = await getFriendsWithProfiles(userId);
    res.json({ friends });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      res.status(403).json({ message: "Sign in to use friends and recommendations" });
      return;
    }
    res.status(500).json({ message: "Failed to list friends" });
  }
});

router.get("/friends/recommendations", async (req, res) => {
  try {
    const userId = userIdFrom(req);
    await ensureUserProfile(userId);

    const friends = await getFriendsWithProfiles(userId);
    const friendIds = friends.map((f) => f.id);

    if (friendIds.length === 0) {
      res.json({
        friends: [],
        friendRecommendations: [],
        sharedComparisons: [],
      });
      return;
    }

    const myGames = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.userId, userId));

    const friendGames = await db
      .select()
      .from(gamesTable)
      .where(inArray(gamesTable.userId, friendIds));

    const myKeys = new Set(myGames.map(gameKey));

    const friendRecommendations: Array<{
      friendId: string;
      friendName: string;
      game: GameSummary;
      reason: string;
    }> = [];

    const friendProfileMap = new Map(friends.map((f) => [f.id, f.displayName]));

    for (const row of friendGames) {
      const key = gameKey(row);
      if (myKeys.has(key)) continue;

      const rating = row.rating ?? 0;
      if (rating < 7 && row.status !== "played") continue;

      friendRecommendations.push({
        friendId: row.userId,
        friendName: friendProfileMap.get(row.userId) ?? "Friend",
        game: toGameSummary(row),
        reason:
          rating >= 8
            ? `Rated ${rating}/10`
            : row.status === "played"
              ? "Completed"
              : "Currently playing",
      });
    }

    friendRecommendations.sort((a, b) => (b.game.rating ?? 0) - (a.game.rating ?? 0));

    const myByKey = new Map(myGames.map((g) => [gameKey(g), g]));
    const sharedByKey = new Map<
      string,
      {
        gameTitle: string;
        coverUrl: string | null;
        steamAppId: number | null;
        myGame: GameSummary | null;
        friends: Array<{
          friendId: string;
          friendName: string;
          hoursPlayed: number | null;
          earnedCount: number;
          status: string;
          rating: number | null;
        }>;
      }
    >();

    for (const row of friendGames) {
      const key = gameKey(row);
      const mine = myByKey.get(key);
      if (!mine) continue;

      let entry = sharedByKey.get(key);
      if (!entry) {
        entry = {
          gameTitle: mine.title,
          coverUrl: mine.coverUrl ?? row.coverUrl,
          steamAppId: mine.steamAppId ?? row.steamAppId,
          myGame: toGameSummary(mine),
          friends: [],
        };
        sharedByKey.set(key, entry);
      }

      entry.friends.push({
        friendId: row.userId,
        friendName: friendProfileMap.get(row.userId) ?? "Friend",
        hoursPlayed: row.hoursPlayed,
        earnedCount: (row.earnedAchievements ?? []).length,
        status: row.status,
        rating: row.rating,
      });
    }

    const sharedComparisons = [...sharedByKey.values()].sort(
      (a, b) => b.friends.length - a.friends.length,
    );

    res.json({
      friends,
      friendRecommendations: friendRecommendations.slice(0, 24),
      sharedComparisons,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      res.status(403).json({ message: "Sign in to use friends and recommendations" });
      return;
    }
    console.error("recommendations error", e);
    res.status(500).json({ message: "Failed to load recommendations" });
  }
});

router.delete("/friends/:friendId", async (req, res) => {
  try {
    const userId = userIdFrom(req);
    const friendId = req.params.friendId;

    await db
      .delete(friendshipsTable)
      .where(
        or(
          and(
            eq(friendshipsTable.userId, userId),
            eq(friendshipsTable.friendId, friendId),
          ),
          and(
            eq(friendshipsTable.userId, friendId),
            eq(friendshipsTable.friendId, userId),
          ),
        ),
      );

    res.status(204).end();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      res.status(403).json({ message: "Sign in to use friends and recommendations" });
      return;
    }
    res.status(500).json({ message: "Failed to remove friend" });
  }
});

export default router;
