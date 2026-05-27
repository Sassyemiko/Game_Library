import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const friendshipsTable = pgTable(
  "friendships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    friendId: text("friend_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userFriendUnique: uniqueIndex("friendships_user_friend_unique").on(
      table.userId,
      table.friendId,
    ),
  }),
);

export type FriendshipRow = typeof friendshipsTable.$inferSelect;
