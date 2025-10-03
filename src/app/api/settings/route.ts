import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAvailableModels, normalizeModelId } from "@/lib/llm/models";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  defaultModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().max(8000).nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.modelSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  return Response.json({
    settings: {
      ...settings,
      defaultModel: normalizeModelId(settings.defaultModel),
    },
    models: getAvailableModels(),
    provider: getAvailableModels()[0]?.provider ?? "openai",
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = settingsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    ...(parsed.data.defaultModel
      ? { defaultModel: normalizeModelId(parsed.data.defaultModel) }
      : {}),
  };

  const settings = await prisma.modelSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return Response.json(settings);
}
