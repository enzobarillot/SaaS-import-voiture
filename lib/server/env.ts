import path from "node:path";

export interface ServerEnv {
  fileStorePath: string;
  sessionSecret: string;
}

export function getServerEnv(): ServerEnv {
  return {
    fileStorePath: process.env.APP_FILE_STORE_PATH || path.join(process.cwd(), "data", "runtime-db.json"),
    sessionSecret: process.env.APP_SESSION_SECRET || "dev-importscore-session-secret"
  };
}