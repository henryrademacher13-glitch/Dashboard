import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type Database from "better-sqlite3";
import { ConversationEngine } from "../core/conversation.js";
import { upsertFact, getFacts, deleteFact, addProject, listProjects, updateProjectStatus } from "../memory/facts.js";

const HELP_TEXT = `
Commands:
  /remember <key> = <value>   Store a fact about you (e.g. /remember favorite_editor = neovim)
  /facts                      List everything Jarvis remembers about you
  /forget <key>               Delete a stored fact
  /project add <name> | <description>   Add or update a project
  /projects                   List projects
  /project done <name>        Mark a project as done
  /help                       Show this message
  /exit                       Quit

Anything else is sent to Jarvis as a normal chat message.
`;

export async function startRepl(db: Database.Database, engine: ConversationEngine): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  stdout.write("Jarvis is online. Type /help for commands, /exit to quit.\n");

  while (true) {
    const input = (await rl.question("> ")).trim();
    if (!input) continue;

    if (input === "/exit") break;

    if (input === "/help") {
      stdout.write(HELP_TEXT);
      continue;
    }

    if (input === "/facts") {
      const facts = getFacts(db);
      if (facts.length === 0) {
        stdout.write("No facts stored yet.\n");
      } else {
        for (const f of facts) stdout.write(`  [${f.category}] ${f.key} = ${f.value}\n`);
      }
      continue;
    }

    if (input.startsWith("/remember ")) {
      const rest = input.slice("/remember ".length);
      const [key, ...valueParts] = rest.split("=");
      const value = valueParts.join("=").trim();
      if (!key?.trim() || !value) {
        stdout.write("Usage: /remember <key> = <value>\n");
        continue;
      }
      upsertFact(db, key.trim(), value);
      stdout.write(`Remembered: ${key.trim()} = ${value}\n`);
      continue;
    }

    if (input.startsWith("/forget ")) {
      const key = input.slice("/forget ".length).trim();
      const deleted = deleteFact(db, key);
      stdout.write(deleted ? `Forgot: ${key}\n` : `No fact found for: ${key}\n`);
      continue;
    }

    if (input === "/projects") {
      const projects = listProjects(db);
      if (projects.length === 0) {
        stdout.write("No projects tracked yet.\n");
      } else {
        for (const p of projects) stdout.write(`  [${p.status}] ${p.name} — ${p.description}\n`);
      }
      continue;
    }

    if (input.startsWith("/project add ")) {
      const rest = input.slice("/project add ".length);
      const [name, ...descParts] = rest.split("|");
      const description = descParts.join("|").trim();
      if (!name?.trim()) {
        stdout.write("Usage: /project add <name> | <description>\n");
        continue;
      }
      addProject(db, name.trim(), description);
      stdout.write(`Project saved: ${name.trim()}\n`);
      continue;
    }

    if (input.startsWith("/project done ")) {
      const name = input.slice("/project done ".length).trim();
      const updated = updateProjectStatus(db, name, "done");
      stdout.write(updated ? `Marked done: ${name}\n` : `No project found: ${name}\n`);
      continue;
    }

    stdout.write("Jarvis: ");
    await engine.send(input, (token) => stdout.write(token));
    stdout.write("\n");
  }

  rl.close();
}
