import type { MessageRole } from "@/generated/prisma";
import type { UIMessage } from "ai";

export type DbMessage = {
  id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  createdAt: Date;
};

export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: Date;
};

export type ModelOption = {
  id: string;
  label: string;
  provider: string;
};

export function dbMessagesToUI(messages: DbMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role:
      m.role === "USER"
        ? "user"
        : m.role === "ASSISTANT"
          ? "assistant"
          : "system",
    parts: [{ type: "text" as const, text: m.content }],
  }));
}
