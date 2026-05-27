import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import gamesRouter from "./games";
import friendsRouter from "./friends";
import { trackerRouter } from "./tracker";
import { getRequestUserId } from "../lib/auth";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getRequestUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use(healthRouter);
// Desktop app (Nexus Tracker) — no auth; local-only playtime sync
router.use("/tracker", trackerRouter);
router.use(requireAuth, gamesRouter);
router.use(requireAuth, friendsRouter);

export default router;
