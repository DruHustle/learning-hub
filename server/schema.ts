import { mysqlTable, varchar, text, timestamp, int, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progress = mysqlTable("progress", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  completedTutorials: json("completed_tutorials").notNull(), // Array of tutorial IDs
  lastVisited: int("last_visited"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
