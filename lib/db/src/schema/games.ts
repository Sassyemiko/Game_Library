import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  date,
  jsonb,
  varchar, // ← Make sure this is imported
} from "drizzle-orm/pg-core";

export const gamesTable = pgTable("games", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  platform: text("platform"),
  genre: text("genre"),
  status: text("status").notNull(),
  rating: integer("rating"),
  coverUrl: text("cover_url"),
  notes: text("notes"),
  hoursPlayed: real("hours_played"),
  startedAt: date("started_at"),
  finishedAt: date("finished_at"),
  steamAppId: integer("steam_app_id"),
  earnedAchievements: jsonb("earned_achievements")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  
  // ✅ This field must exist:
  executablePath: varchar("executable_path", { length: 1024 }),
});

export type GameRow = typeof gamesTable.$inferSelect;
export type GameInsert = typeof gamesTable.$inferInsert;