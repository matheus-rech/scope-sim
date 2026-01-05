import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

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
