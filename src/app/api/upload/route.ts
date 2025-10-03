import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? 10);

async function extractText(buffer: Buffer, mimeType: string, fileName: string) {
  if (mimeType === "text/plain" || fileName.endsWith(".txt")) {
    return buffer.toString("utf-8").slice(0, 50_000);
  }
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text.slice(0, 50_000);
    } catch {
      return null;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const chatId = formData.get("chatId");

  if (!(file instanceof File) || typeof chatId !== "string") {
    return Response.json({ error: "file and chatId required" }, { status: 400 });
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
  });
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  if (file.size > MAX_MB * 1024 * 1024) {
    return Response.json({ error: `File exceeds ${MAX_MB}MB` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", chatId);
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(uploadDir, `${Date.now()}-${safeName}`);
  await writeFile(filePath, buffer);

  const extractedText = await extractText(buffer, file.type, file.name);
  const isImage = file.type.startsWith("image/");

  const attachment = await prisma.attachment.create({
    data: {
      chatId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      url: `/uploads/${chatId}/${path.basename(filePath)}`,
      extractedText: isImage ? `[Image uploaded: ${file.name}]` : extractedText,
    },
  });

  return Response.json({
    id: attachment.id,
    fileName: attachment.fileName,
    url: attachment.url,
    extractedText: attachment.extractedText,
    isImage,
  });
}
