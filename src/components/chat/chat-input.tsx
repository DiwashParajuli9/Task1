"use client";

import {
  AudioLines,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Square,
} from "lucide-react";
import { useRef, useState } from "react";
import type { VoicePhase } from "@/hooks/use-voice-mode";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { VoiceModeBar } from "@/components/chat/voice-mode-bar";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
  chatId: string;
  voiceMode: boolean;
  onVoiceModeChange: (enabled: boolean) => void;
  voicePhase: VoicePhase;
  voiceError: string | null;
  voiceSupported: boolean;
  onFileUploaded?: () => void;
};

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  chatId,
  voiceMode,
  onVoiceModeChange,
  voicePhase,
  voiceError,
  voiceSupported,
  onFileUploaded,
}: Props) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { supported, listening, transcribing, error, start, clearError } =
    useSpeechInput(
    (transcript) => {
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      clearError();
    },
  );

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

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        {voiceMode && (
          <VoiceModeBar
            phase={voicePhase}
            error={voiceError}
            onExit={() => onVoiceModeChange(false)}
          />
        )}
        {error && !voiceMode && (
          <p className="mb-2 rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-center text-xs text-amber-200">
            {error}
          </p>
        )}
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
            onClick={() => onVoiceModeChange(!voiceMode)}
            disabled={!voiceSupported}
            className={cn(
              "mb-1 rounded-lg p-2 hover:bg-zinc-800",
              !voiceSupported && "cursor-not-allowed opacity-40",
              voiceMode
                ? "bg-emerald-600/20 text-emerald-400"
                : "text-zinc-400 hover:text-zinc-200",
            )}
            title={
              voiceMode
                ? "Exit voice mode"
                : voiceSupported
                  ? "Voice mode — talk naturally"
                  : "Voice not supported in this browser"
            }
          >
            <AudioLines className="h-5 w-5" />
          </button>
          {!voiceMode && (
            <button
              type="button"
              onClick={start}
              disabled={!supported || transcribing}
              className={cn(
                "mb-1 rounded-lg p-2 hover:bg-zinc-800",
                (!supported || transcribing) && "cursor-not-allowed opacity-40",
                listening
                  ? "text-red-400 animate-pulse"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
              title={
                transcribing
                  ? "Transcribing…"
                  : supported
                    ? listening
                      ? "Stop recording"
                      : "Dictate message"
                    : "Voice not supported in this browser"
              }
            >
              {transcribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : supported ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
          )}
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
          {voiceMode
            ? "Speak, pause when done — your message sends automatically and replies are read aloud."
            : "Use voice mode for hands-free chat, or the mic to dictate into the text box."}
        </p>
      </form>
    </div>
  );
}
