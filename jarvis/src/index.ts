import { loadConfig } from "./core/config.js";
import { getDb } from "./memory/db.js";
import { startConversation } from "./memory/history.js";
import { ConversationEngine } from "./core/conversation.js";
import { startRepl } from "./cli/repl.js";

async function main() {
  const config = loadConfig();
  const db = getDb(config.dbPath);
  const conversationId = startConversation(db);
  const engine = new ConversationEngine(db, config, conversationId);

  await startRepl(db, engine);
  console.log("Goodbye.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
