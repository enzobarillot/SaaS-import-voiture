import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from "@/lib/reference-data";
import { getProductAccess } from "@/lib/product/access";
import { mutateDatabase } from "@/lib/server/database";
import { getServerEnv } from "@/lib/server/env";
import { AccountUser, AuthSession, SessionEnvelope } from "@/types";
import { countReportsForUser } from "@/lib/server/reports";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualHash = hashPassword(password, salt);
  return timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

function hashToken(token: string): string {
  return createHash("sha256").update(`${token}:${getServerEnv().sessionSecret}`).digest("hex");
}

function toPublicUser(user: { id: string; email: string; planTier: "free" | "premium"; createdAt: string; lastLoginAt?: string }): AccountUser {
  return {
    id: user.id,
    email: user.email,
    planTier: user.planTier,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

async function setSessionCookie(token: string, expiresAt: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

async function issueSession(userId: string): Promise<AuthSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rawToken = `${randomUUID()}-${randomBytes(18).toString("hex")}`;
  const tokenHash = hashToken(rawToken);

  const session = await mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const sessionRecord = {
      id: randomUUID(),
      userId,
      tokenHash,
      createdAt: now.toISOString(),
      expiresAt,
      lastSeenAt: now.toISOString()
    };

    database.sessions = database.sessions.filter((candidate) => candidate.userId !== userId || new Date(candidate.expiresAt) > now);
    database.sessions.push(sessionRecord);
    user.lastLoginAt = now.toISOString();

    return {
      user: toPublicUser(user),
      expiresAt
    } satisfies AuthSession;
  });

  await setSessionCookie(rawToken, expiresAt);
  return session;
}

export async function registerUserWithPassword(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = normalizeEmail(email);
  validatePassword(password);

  const userId = await mutateDatabase((database) => {
    if (database.users.some((candidate) => candidate.email === normalizedEmail)) {
      throw new Error("An account already exists for this email.");
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const createdAt = new Date().toISOString();
    const userId = randomUUID();

    database.users.push({
      id: userId,
      email: normalizedEmail,
      passwordHash,
      passwordSalt: salt,
      planTier: "free",
      createdAt
    });

    return userId;
  });

  return issueSession(userId);
}

export async function loginUserWithPassword(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = normalizeEmail(email);

  const userId = await mutateDatabase((database) => {
    const user = database.users.find((candidate) => candidate.email === normalizedEmail);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      throw new Error("Invalid email or password.");
    }

    user.lastLoginAt = new Date().toISOString();
    return user.id;
  });

  return issueSession(userId);
}

export async function getRequestSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const session = await mutateDatabase((database) => {
    const sessionRecord = database.sessions.find((candidate) => candidate.tokenHash === tokenHash);
    if (!sessionRecord) {
      return null;
    }

    if (new Date(sessionRecord.expiresAt) <= now) {
      database.sessions = database.sessions.filter((candidate) => candidate.tokenHash !== tokenHash);
      return null;
    }

    sessionRecord.lastSeenAt = now.toISOString();
    const user = database.users.find((candidate) => candidate.id === sessionRecord.userId);
    if (!user) {
      database.sessions = database.sessions.filter((candidate) => candidate.tokenHash !== tokenHash);
      return null;
    }

    return {
      user: toPublicUser(user),
      expiresAt: sessionRecord.expiresAt
    } satisfies AuthSession;
  });

  if (!session) {
    await clearSessionCookie();
  }

  return session;
}

export async function signOutCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await mutateDatabase((database) => {
      database.sessions = database.sessions.filter((candidate) => candidate.tokenHash !== tokenHash);
    });
  }

  await clearSessionCookie();
}

export async function getSessionEnvelope(): Promise<SessionEnvelope> {
  const session = await getRequestSession();
  const reportCount = session ? await countReportsForUser(session.user.id) : 0;

  return {
    session,
    access: getProductAccess(session),
    reportCount
  };
}