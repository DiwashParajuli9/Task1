import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ chatId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId } = await params;
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!chat) {
    return new Response("Not found", { status: 404 });
  }

  const markdown = [
    `# ${chat.title}`,
    "",
    ...chat.messages.map((m) => {
      const role = m.role === "USER" ? "You" : "Assistant";
      return `## ${role}\n\n${m.content}\n`;
    }),
  ].join("\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${chat.title.replace(/[^a-z0-9]/gi, "_")}.md"`,
    },
  });
}
