import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ChatHomePage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let chat = await prisma.chat.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!chat) {
    chat = await prisma.chat.create({
      data: { userId: session.user.id },
      select: { id: true },
    });
  }

  redirect(`/c/${chat.id}`);
}
