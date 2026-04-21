import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import gamesRouter from "./games";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Dev-only: allow unauthenticated browsing when the guest header is set.
  if (
    process.env.NODE_ENV !== "production" &&
    req.headers["x-guest-mode"] === "true"
  ) {
    return next();
  }
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.sub || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use(healthRouter);
router.use(requireAuth, gamesRouter);

export default router;
