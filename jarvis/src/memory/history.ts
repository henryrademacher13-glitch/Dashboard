import type Database from "better-sqlite3";

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function startConversation(db: Database.Database): number {
  const result = db.prepare("INSERT INTO conversations DEFAULT VALUES").run();
  return result.lastInsertRowid as number;
}

export function logMessage(db: Database.Database, conversationId: number, role: "user" | "assistant", content: string): void {
  db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, role, content);
}

export function getRecentMessages(db: Database.Database, conversationId: number, limit = 50): Message[] {
  const rows = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?")
    .all(conversationId, limit) as Message[];
  return rows.reverse();
}

export function getPastConversationSummaries(db: Database.Database, excludeConversationId: number, limit = 10): string[] {
  const rows = db
    .prepare(
      "SELECT summary FROM conversations WHERE id != ? AND summary IS NOT NULL ORDER BY started_at DESC LIMIT ?"
    )
    .all(excludeConversationId, limit) as { summary: string }[];
  return rows.map((r) => r.summary);
}

export function setConversationSummary(db: Database.Database, conversationId: number, summary: string): void {
  db.prepare("UPDATE conversations SET summary = ? WHERE id = ?").run(summary, conversationId);
}
