import "dotenv/config";

export interface Config {
  anthropicApiKey: string;
  model: string;
  dbPath: string;
  userName: string;
}

export function loadConfig(): Config {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.");
  }

  return {
    anthropicApiKey,
    model: process.env.JARVIS_MODEL || "claude-sonnet-4-5",
    dbPath: process.env.JARVIS_DB_PATH || "./data/jarvis.db",
    userName: process.env.JARVIS_USER_NAME || "",
  };
}
