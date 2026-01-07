import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const simulationSessions = pgTable("simulation_sessions", {
  id: serial("id").primaryKey(),
  scenarioType: text("scenario_type").notNull(),
  knospGrade: text("knosp_grade").notNull(),
  goal: text("goal").notNull(),
  levelReached: integer("level_reached").default(1),
  completed: boolean("completed").default(false),
  score: integer("score").default(0),
  timeElapsed: integer("time_elapsed").default(0),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSimulationSessionSchema = z.object({
  scenarioType: z.string(),
  knospGrade: z.string(),
  goal: z.string(),
  levelReached: z.number().optional(),
  completed: z.boolean().optional(),
  score: z.number().optional(),
  timeElapsed: z.number().optional(),
  metrics: z.any().optional(),
});

export type InsertSimulationSession = z.infer<typeof insertSimulationSessionSchema>;
export type SimulationSession = typeof simulationSessions.$inferSelect;

// Chat conversations for AI coaching
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = z.object({
  title: z.string(),
});

export const insertMessageSchema = z.object({
  conversationId: z.number(),
  role: z.string(),
  content: z.string(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
