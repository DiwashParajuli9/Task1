export async function transcribeAudioBlob(blob: Blob): Promise<string> {
  const form = new FormData();
  const ext = blob.type.includes("mp4") ? "m4a" : "webm";
  form.append("audio", blob, `recording.${ext}`);
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Transcription failed");
  }
  return data.text?.trim() ?? "";
}
