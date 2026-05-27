import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, type UserRow } from "@workspace/db";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }
  return code;
}

export async function ensureUserProfile(userId: string): Promise<UserRow> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (existing) return existing;

  for (let attempt = 0; attempt < 8; attempt++) {
    const referralCode = generateReferralCode();
    try {
      const [created] = await db
        .insert(usersTable)
        .values({ id: userId, referralCode })
        .returning();
      if (created) return created;
    } catch {
      // unique collision on referral_code — retry
    }
  }

  throw new Error("Failed to create user profile");
}

export function displayLabel(user: UserRow): string {
  return user.displayName?.trim() || `Player ${user.referralCode}`;
}
