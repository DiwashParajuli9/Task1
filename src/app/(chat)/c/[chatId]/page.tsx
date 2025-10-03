import { notFound } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { getSession } from "@/lib/auth";
import {
  getAvailableModels,
  getDefaultModelId,
  normalizeModelId,
} from "@/lib/llm/models";
import { prisma } from "@/lib/prisma";
import { dbMessagesToUI } from "@/types";

type Props = { params: Promise<{ chatId: string }> };

export default async function ChatPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const { chatId } = await params;

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chat) notFound();

  const settings = await prisma.modelSettings.findUnique({
    where: { userId: session.user.id },
  });

  const initialMessages = dbMessagesToUI(
    chat.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      model: m.model,
      createdAt: m.createdAt,
    })),
  );

  const models = getAvailableModels();
  const defaultModel = normalizeModelId(
    settings?.defaultModel ?? getDefaultModelId(),
  );

  return (
    <ChatInterface
      chatId={chat.id}
      initialMessages={initialMessages}
      defaultModel={defaultModel}
      models={models}
    />
  );
}
