import type { Request } from "express";
import { getAuth } from "@clerk/express";

export const GUEST_USER_ID = "guest";

/** Clerk user id, or a fixed id for dev guest preview. */
export function getRequestUserId(req: Request): string | null {
  if (
    process.env.NODE_ENV !== "production" &&
    req.headers["x-guest-mode"] === "true"
  ) {
    return GUEST_USER_ID;
  }

  const auth = getAuth(req);
  return auth?.sessionClaims?.sub ?? auth?.userId ?? null;
}

export function isGuestRequest(req: Request): boolean {
  return getRequestUserId(req) === GUEST_USER_ID;
}
