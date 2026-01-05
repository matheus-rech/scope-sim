import { simulationSessions, type SimulationSession, type InsertSimulationSession } from "@shared/schema";

export interface IStorage {
  createSession(session: InsertSimulationSession): Promise<SimulationSession>;
  getSession(id: number): Promise<SimulationSession | undefined>;
  updateSession(id: number, updates: Partial<InsertSimulationSession>): Promise<SimulationSession | undefined>;
  getSessions(): Promise<SimulationSession[]>;
}

export class MemStorage implements IStorage {
  private sessions: Map<number, SimulationSession> = new Map();
  private currentId = 1;

  async createSession(session: InsertSimulationSession): Promise<SimulationSession> {
    const id = this.currentId++;
    const newSession: SimulationSession = {
      id,
      scenarioType: session.scenarioType,
      knospGrade: session.knospGrade,
      goal: session.goal,
      levelReached: session.levelReached ?? 1,
      completed: session.completed ?? false,
      score: session.score ?? 0,
      timeElapsed: session.timeElapsed ?? 0,
      metrics: session.metrics ?? null,
      createdAt: new Date(),
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async getSession(id: number): Promise<SimulationSession | undefined> {
    return this.sessions.get(id);
  }

  async updateSession(id: number, updates: Partial<InsertSimulationSession>): Promise<SimulationSession | undefined> {
    const existing = this.sessions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.sessions.set(id, updated);
    return updated;
  }

  async getSessions(): Promise<SimulationSession[]> {
    return Array.from(this.sessions.values());
  }
}

export const storage = new MemStorage();
