import { experimental_transcribe as transcribe } from "ai";
import { getSession } from "@/lib/auth";
import { resolveTranscriptionModel } from "@/lib/llm/models";
import { rateLimit } from "@/lib/rate-limit";

const MAX_AUDIO_MB = 5;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(session.user.id);
  if (!limit.success) {
    return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "audio file required" }, { status: 400 });
  }

  if (audio.size > MAX_AUDIO_MB * 1024 * 1024) {
    return Response.json({ error: `Audio exceeds ${MAX_AUDIO_MB}MB` }, { status: 400 });
  }

  if (audio.size < 100) {
    return Response.json({ error: "Recording too short" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const { text } = await transcribe({
      model: resolveTranscriptionModel(),
      audio: buffer,
    });
    return Response.json({ text: text?.trim() ?? "" });
  } catch (err) {
    console.error("[transcribe]", err);
    return Response.json({ error: "Transcription failed. Check your API key." }, { status: 500 });
  }
}
