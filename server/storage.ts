import { eq } from "drizzle-orm";
import { db } from "./db";
import { simulationSessions, type SimulationSession, type InsertSimulationSession } from "@shared/schema";

export interface IStorage {
  createSession(session: InsertSimulationSession): Promise<SimulationSession>;
  getSession(id: number): Promise<SimulationSession | undefined>;
  updateSession(id: number, updates: Partial<InsertSimulationSession>): Promise<SimulationSession | undefined>;
  getSessions(): Promise<SimulationSession[]>;
}

export class DatabaseStorage implements IStorage {
  async createSession(session: InsertSimulationSession): Promise<SimulationSession> {
    const [newSession] = await db
      .insert(simulationSessions)
      .values({
        scenarioType: session.scenarioType,
        knospGrade: session.knospGrade,
        goal: session.goal,
        levelReached: session.levelReached ?? 1,
        completed: session.completed ?? false,
        score: session.score ?? 0,
        timeElapsed: session.timeElapsed ?? 0,
        metrics: session.metrics ?? null,
      })
      .returning();
    return newSession;
  }

  async getSession(id: number): Promise<SimulationSession | undefined> {
    const [session] = await db
      .select()
      .from(simulationSessions)
      .where(eq(simulationSessions.id, id));
    return session;
  }

  async updateSession(id: number, updates: Partial<InsertSimulationSession>): Promise<SimulationSession | undefined> {
    const [updated] = await db
      .update(simulationSessions)
      .set(updates)
      .where(eq(simulationSessions.id, id))
      .returning();
    return updated;
  }

  async getSessions(): Promise<SimulationSession[]> {
    return await db.select().from(simulationSessions);
  }
}

export const storage = new DatabaseStorage();
