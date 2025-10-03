"use client";

import { Bot, User } from "lucide-react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "./markdown-message";

function getText(message: UIMessage) {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export function MessageBubble({
  message,
  isStreaming,
}: {
  message: UIMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const text = getText(message);

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-6",
        isUser ? "bg-transparent" : "bg-zinc-900/40",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-emerald-600" : "bg-zinc-700",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-zinc-200" />
        )}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="mb-1 text-xs font-medium text-zinc-500">
          {isUser ? "You" : "Assistant"}
        </p>
        <div className="prose-invert max-w-none text-[15px] text-zinc-100">
          {isUser ? (
            <p className="whitespace-pre-wrap leading-7">{text}</p>
          ) : (
            <>
              <MarkdownMessage content={text} />
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-emerald-400" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
