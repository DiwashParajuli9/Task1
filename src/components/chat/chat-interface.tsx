"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { formatChatError } from "@/lib/llm/errors";
import type { ModelOption } from "@/types";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";

type Props = {
  chatId: string;
  initialMessages: UIMessage[];
  defaultModel: string;
  models: ModelOption[];
};

export function ChatInterface({
  chatId,
  initialMessages,
  defaultModel,
  models,
}: Props) {
  const [model, setModel] = useState(defaultModel);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { chatId, model },
      }),
    [chatId, model],
  );

  const { messages, sendMessage, status, stop, regenerate, setMessages, error } =
    useChat({
      id: chatId,
      messages: initialMessages,
      transport,
    });

  const isLoading = status === "streaming" || status === "submitted";
  const { bottomRef, containerRef } = useChatScroll(messages.length, isLoading);

  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <select
          value={models.some((m) => m.id === model) ? model : defaultModel}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <a
            href={`/api/export/${chatId}`}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Export
          </a>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => regenerate()}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-900/60 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {formatChatError(error)}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <h2 className="text-2xl font-semibold text-zinc-100">
              How can I help you today?
            </h2>
            <p className="mt-2 max-w-md text-zinc-500">
              Ask anything, upload documents, or use voice input. Your
              conversations are saved automatically.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={
                  isLoading &&
                  message.role === "assistant" &&
                  message.id === lastAssistantId
                }
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <ChatInput
        chatId={chatId}
        isLoading={isLoading}
        onSend={(text) => sendMessage({ text })}
        onStop={stop}
        onFileUploaded={async () => {
          const res = await fetch(`/api/chats/${chatId}`);
          if (res.ok) {
            const data = await res.json();
            const uiMessages = data.messages.map(
              (m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role:
                  m.role === "USER"
                    ? "user"
                    : m.role === "ASSISTANT"
                      ? "assistant"
                      : "system",
                parts: [{ type: "text" as const, text: m.content }],
              }),
            );
            setMessages(uiMessages);
          }
        }}
      />
    </div>
  );
}
