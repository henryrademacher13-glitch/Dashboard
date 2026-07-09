import type Database from "better-sqlite3";

export interface Fact {
  id: number;
  key: string;
  value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function upsertFact(db: Database.Database, key: string, value: string, category = "general"): void {
  db.prepare(
    `INSERT INTO facts (key, value, category) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = datetime('now')`
  ).run(key, value, category);
}

export function getFacts(db: Database.Database, category?: string): Fact[] {
  if (category) {
    return db.prepare("SELECT * FROM facts WHERE category = ? ORDER BY key").all(category) as Fact[];
  }
  return db.prepare("SELECT * FROM facts ORDER BY category, key").all() as Fact[];
}

export function deleteFact(db: Database.Database, key: string): boolean {
  const result = db.prepare("DELETE FROM facts WHERE key = ?").run(key);
  return result.changes > 0;
}

export function addProject(db: Database.Database, name: string, description = ""): void {
  db.prepare(
    `INSERT INTO projects (name, description) VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET description = excluded.description, updated_at = datetime('now')`
  ).run(name, description);
}

export function listProjects(db: Database.Database, status?: string): Project[] {
  if (status) {
    return db.prepare("SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC").all(status) as Project[];
  }
  return db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as Project[];
}

export function updateProjectStatus(db: Database.Database, name: string, status: string): boolean {
  const result = db
    .prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE name = ?")
    .run(status, name);
  return result.changes > 0;
}
