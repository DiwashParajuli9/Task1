"use client";

import { Loader2, Mic, Volume2 } from "lucide-react";
import type { VoicePhase } from "@/hooks/use-voice-mode";
import { cn } from "@/lib/utils";

const LABELS: Record<VoicePhase, string> = {
  idle: "Starting…",
  listening: "Listening — speak naturally",
  transcribing: "Understanding…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

type Props = {
  phase: VoicePhase;
  error: string | null;
  onExit: () => void;
};

export function VoiceModeBar({ phase, error, onExit }: Props) {
  const isActive = phase === "listening";
  const isBusy = phase === "transcribing" || phase === "thinking" || phase === "speaking";

  return (
    <div className="mx-auto mb-3 max-w-3xl rounded-2xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isActive
                ? "bg-emerald-600/30 text-emerald-400"
                : "bg-zinc-800 text-zinc-400",
            )}
          >
            {phase === "speaking" ? (
              <Volume2 className={cn("h-5 w-5", isBusy && "animate-pulse")} />
            ) : isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className={cn("h-5 w-5", isActive && "animate-pulse")} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-100">Voice mode</p>
            <p className="truncate text-xs text-emerald-200/70">
              {error ?? LABELS[phase]}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          End
        </button>
      </div>
      {isActive && (
        <div className="mt-3 flex justify-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-2 w-1 animate-pulse rounded-full bg-emerald-500/80"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
