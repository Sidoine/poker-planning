import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    storyTitle: text("story_title").notNull().default(""),
    storyUrl: text("story_url").notNull().default(""),
    deck: text("deck").notNull().default("fibonacci"),
    revealed: boolean("revealed").notNull().default(false),
    round: integer("round").notNull().default(1),
    ownerToken: text("owner_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rooms_code_unique").on(table.code)],
);

export const participants = pgTable(
  "participants",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar").notNull(),
    vote: text("vote"),
    isCreator: boolean("is_creator").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("participants_room_token_unique").on(table.roomId, table.token),
    index("participants_room_idx").on(table.roomId),
  ],
);

export type Room = typeof rooms.$inferSelect;
export type Participant = typeof participants.$inferSelect;
