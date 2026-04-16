import { promises as fs } from "node:fs";
import path from "node:path";
import type { FeedbackRecord, LeadRecord, ReportDocument } from "@/types";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import { getServerEnv } from "@/lib/server/env";

export interface StoredUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  planTier: "free" | "premium";
  createdAt: string;
  lastLoginAt?: string;
}

export interface StoredSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt?: string;
}

export interface StoredReportRecord {
  id: string;
  ownerUserId: string;
  shareId?: string;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
  document: ReportDocument;
}

export interface StoredAnalyticsEventRecord {
  id: string;
  name: AnalyticsEventName;
  payload: Record<string, unknown>;
  anonymousId?: string;
  userId?: string;
  path?: string;
  referrer?: string;
  userAgent?: string;
  createdAt: string;
}

export interface FileDatabaseShape {
  users: StoredUserRecord[];
  sessions: StoredSessionRecord[];
  reports: StoredReportRecord[];
  leads: LeadRecord[];
  feedback: FeedbackRecord[];
  analyticsEvents: StoredAnalyticsEventRecord[];
}

const EMPTY_DATABASE: FileDatabaseShape = {
  users: [],
  sessions: [],
  reports: [],
  leads: [],
  feedback: [],
  analyticsEvents: []
};

let mutationQueue = Promise.resolve();

async function ensureStoreFile(): Promise<string> {
  const storePath = getServerEnv().fileStorePath;
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(EMPTY_DATABASE, null, 2), "utf8");
  }

  return storePath;
}

export async function readDatabase(): Promise<FileDatabaseShape> {
  const storePath = await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");

  try {
    const parsed = JSON.parse(raw) as FileDatabaseShape;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
      analyticsEvents: Array.isArray(parsed.analyticsEvents) ? parsed.analyticsEvents : []
    };
  } catch {
    return { ...EMPTY_DATABASE };
  }
}

async function writeDatabase(nextDatabase: FileDatabaseShape): Promise<void> {
  const storePath = await ensureStoreFile();
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(nextDatabase, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
}

export async function mutateDatabase<T>(mutator: (database: FileDatabaseShape) => Promise<T> | T): Promise<T> {
  const runMutation = async () => {
    const database = await readDatabase();
    const result = await mutator(database);
    await writeDatabase(database);
    return result;
  };

  const current = mutationQueue.then(runMutation, runMutation);
  mutationQueue = current.then(() => undefined, () => undefined);
  return current;
}