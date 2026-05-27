import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { gamesTable, db } from "@workspace/db";
// Note: Removed requireAuth - desktop app calls these locally without auth

const router = Router();

// Store active sessions in memory (use Redis in production)
const activeSessions = new Map<
  string,
  {
    baseHours: number;
    lastHeartbeat: Date;
    totalSeconds: number;
  }
>();

// Heartbeat endpoint (called every 30 seconds by desktop app)
router.post("/heartbeat", async (req: Request, res: Response) => {
  try {
    const { game_id, seconds } = req.body;

    if (!game_id || typeof seconds !== "number") {
      res.status(400).json({ message: "Invalid request" });
      return;
    }

    // Find game in database
    const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, game_id));

    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    let session = activeSessions.get(game_id);
    if (!session) {
      session = {
        baseHours: game.hoursPlayed ?? 0,
        lastHeartbeat: new Date(),
        totalSeconds: seconds,
      };
      activeSessions.set(game_id, session);
    } else {
      session.lastHeartbeat = new Date();
      session.totalSeconds = seconds;
    }

    const totalHours = session.baseHours + seconds / 3600;
    await db
      .update(gamesTable)
      .set({
        hoursPlayed: totalHours,
        status: "playing",
      })
      .where(eq(gamesTable.id, game_id));

    res.json({ success: true, hours: totalHours });
  } catch (error) {
    console.error("Heartbeat error:", error);
    res.status(500).json({ message: "Failed to record playtime" });
  }
});

// Session end endpoint (called when game closes)
router.post("/session-end", async (req: Request, res: Response) => {
  try {
    const { game_id, seconds } = req.body;

    if (!game_id || typeof seconds !== "number") {
      res.status(400).json({ message: "Invalid request" });
      return;
    }

    const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, game_id));

    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    const session = activeSessions.get(game_id);
    const baseHours = session?.baseHours ?? game.hoursPlayed ?? 0;
    const totalHours = baseHours + seconds / 3600;

    await db
      .update(gamesTable)
      .set({
        hoursPlayed: totalHours,
      })
      .where(eq(gamesTable.id, game_id));

    activeSessions.delete(game_id);

    res.json({ success: true, totalHours });
  } catch (error) {
    console.error("Session-end error:", error);
    res.status(500).json({ message: "Failed to finalize session" });
  }
});

// Get active sessions endpoint
router.get("/active", async (req: Request, res: Response) => {
  const sessions = Array.from(activeSessions.values());
  res.json({ sessions });
});

export { router as trackerRouter };