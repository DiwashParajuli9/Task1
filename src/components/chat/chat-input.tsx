"use client";

import {
  Loader2,
  Mic,
  Paperclip,
  Send,
  Square,
} from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
  chatId: string;
  onFileUploaded?: () => void;
};

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  chatId,
  onFileUploaded,
}: Props) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("chatId", chatId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      onFileUploaded?.();
      setInput((prev) =>
        prev
          ? `${prev}\n[Attached: ${file.name}]`
          : `[Attached: ${file.name}]`,
      );
    } finally {
      setUploading(false);
    }
  }

  function startVoice() {
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-lg">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mb-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            title="Upload file"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={startVoice}
            className={cn(
              "mb-1 rounded-lg p-2 hover:bg-zinc-800",
              listening ? "text-red-400" : "text-zinc-400 hover:text-zinc-200",
            )}
            title="Voice input"
          >
            <Mic className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Chat…"
            rows={1}
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="mb-1 rounded-xl bg-red-600/90 p-2.5 text-white hover:bg-red-500"
              title="Stop generating"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="mb-1 rounded-xl bg-emerald-600 p-2.5 text-white hover:bg-emerald-500 disabled:opacity-40"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-zinc-600">
          AI can make mistakes. Upload PDFs, images, or text files for context.
        </p>
      </form>
    </div>
  );
}
