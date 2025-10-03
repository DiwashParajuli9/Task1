import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { MessageRole } from "@/generated/prisma";
import { getSession } from "@/lib/auth";
import {
  buildHistoryMessages,
  buildSystemPrompt,
} from "@/lib/llm/context";
import {
  getDefaultModelId,
  normalizeModelId,
  resolveModel,
} from "@/lib/llm/models";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { truncate } from "@/lib/utils";

export const maxDuration = 60;

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const limit = await rateLimit(session.user.id);
  if (!limit.success) {
    return new Response("Too many requests. Please try again later.", {
      status: 429,
    });
  }

  let body: {
    messages: UIMessage[];
    chatId?: string;
    model?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages, chatId, model: modelOverride } = body;
  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
  });
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const settings = await prisma.modelSettings.findUnique({
    where: { userId: session.user.id },
  });

  const modelId = normalizeModelId(
    modelOverride ?? settings?.defaultModel ?? getDefaultModelId(),
  );
  const temperature = settings?.temperature ?? 0.7;
  const systemPrompt =
    settings?.systemPrompt ??
    "You are a helpful, accurate, and friendly AI assistant.";

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUser ? extractText(lastUser) : "";

  if (userText) {
    const lastDb = await prisma.message.findFirst({
      where: { chatId, role: MessageRole.USER },
      orderBy: { createdAt: "desc" },
    });
    if (!lastDb || lastDb.content !== userText) {
      await prisma.message.create({
        data: {
          chatId,
          role: MessageRole.USER,
          content: userText,
        },
      });
      if (chat.title === "New chat") {
        await prisma.chat.update({
          where: { id: chatId },
          data: { title: truncate(userText) },
        });
      }
    }
  }

  const attachments = await prisma.attachment.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const attachmentContext = attachments
    .filter((a) => a.extractedText)
    .map((a) => `[${a.fileName}]\n${a.extractedText}`)
    .join("\n\n");

  const dbHistory = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  const system = buildSystemPrompt(systemPrompt, attachmentContext);
  const historyMessages =
    dbHistory.length > 0
      ? buildHistoryMessages(dbHistory)
      : (await convertToModelMessages(messages)).filter((m) => m.role !== "system");

  try {
    const result = streamText({
      model: resolveModel(modelId),
      system,
      messages: historyMessages,
      temperature,
      maxRetries: 2,
      onFinish: async ({ text, usage }) => {
        if (!text.trim()) return;
        await prisma.message.create({
          data: {
            chatId,
            role: MessageRole.ASSISTANT,
            content: text,
            model: modelId,
            promptTokens: usage?.inputTokens ?? null,
            completionTokens: usage?.outputTokens ?? null,
          },
        });
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    console.error("[chat]", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
