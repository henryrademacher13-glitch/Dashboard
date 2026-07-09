import Anthropic from "@anthropic-ai/sdk";
import type Database from "better-sqlite3";
import type { Config } from "./config.js";
import { getFacts, listProjects } from "../memory/facts.js";
import { getPastConversationSummaries, getRecentMessages, logMessage } from "../memory/history.js";

const MAX_HISTORY_MESSAGES = 30;

function buildSystemPrompt(db: Database.Database, config: Config, conversationId: number): string {
  const facts = getFacts(db);
  const activeProjects = listProjects(db, "active");
  const pastSummaries = getPastConversationSummaries(db, conversationId, 5);

  const lines: string[] = [
    "You are Jarvis, a personal AI assistant running locally for your user.",
    "Be direct and concise. You do not currently have any tools connected — that comes in a later phase — so just have a helpful conversation and let the user know if something requires a capability you don't have yet.",
  ];

  if (config.userName) {
    lines.push(`The user's name is ${config.userName}.`);
  }

  if (facts.length > 0) {
    lines.push("\nKnown facts about the user:");
    for (const fact of facts) {
      lines.push(`- [${fact.category}] ${fact.key}: ${fact.value}`);
    }
  }

  if (activeProjects.length > 0) {
    lines.push("\nActive projects:");
    for (const project of activeProjects) {
      lines.push(`- ${project.name}: ${project.description}`);
    }
  }

  if (pastSummaries.length > 0) {
    lines.push("\nSummaries of recent past conversations:");
    for (const summary of pastSummaries) {
      lines.push(`- ${summary}`);
    }
  }

  return lines.join("\n");
}

export class ConversationEngine {
  private client: Anthropic;

  constructor(
    private db: Database.Database,
    private config: Config,
    private conversationId: number
  ) {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async send(userText: string, onToken: (token: string) => void): Promise<string> {
    logMessage(this.db, this.conversationId, "user", userText);

    const history = getRecentMessages(this.db, this.conversationId, MAX_HISTORY_MESSAGES);
    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const system = buildSystemPrompt(this.db, this.config, this.conversationId);

    let fullText = "";
    const stream = this.client.messages.stream({
      model: this.config.model,
      max_tokens: 1024,
      system,
      messages,
    });

    stream.on("text", (token) => {
      fullText += token;
      onToken(token);
    });

    await stream.finalMessage();

    logMessage(this.db, this.conversationId, "assistant", fullText);
    return fullText;
  }
}
