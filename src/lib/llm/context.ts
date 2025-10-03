import type { ModelMessage } from "ai";
import type { MessageRole } from "@/generated/prisma";

const MAX_CHARS = 120_000;

type HistoryMessage = {
  role: MessageRole;
  content: string;
};

export function buildSystemPrompt(
  systemPrompt: string,
  attachmentContext?: string,
): string {
  let system = systemPrompt;
  if (attachmentContext?.trim()) {
    system += `\n\nAttached document context:\n${attachmentContext}`;
  }
  return system;
}

export function buildHistoryMessages(history: HistoryMessage[]): ModelMessage[] {
  const messages: ModelMessage[] = [];
  const trimmed = trimHistory(history);

  for (const msg of trimmed) {
    if (msg.role === "USER") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.role === "ASSISTANT") {
      messages.push({ role: "assistant", content: msg.content });
    }
  }

  return messages;
}

function trimHistory(history: HistoryMessage[]): HistoryMessage[] {
  let total = 0;
  const reversed: HistoryMessage[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === "SYSTEM") continue;
    total += msg.content.length;
    if (total > MAX_CHARS) break;
    reversed.push(msg);
  }

  return reversed.reverse();
}
