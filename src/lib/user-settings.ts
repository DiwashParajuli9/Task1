import { prisma } from "@/lib/prisma";

/** MongoDB ObjectId hex string (24 chars). */
export function isValidObjectId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

export async function ensureModelSettings(userId: string) {
  if (!isValidObjectId(userId)) return;

  await prisma.modelSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
