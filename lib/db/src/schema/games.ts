import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  date,
} from "drizzle-orm/pg-core";

export const gamesTable = pgTable("games", {
  id: text("id").primaryKey(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GameRow = typeof gamesTable.$inferSelect;
export type GameInsert = typeof gamesTable.$inferInsert;
