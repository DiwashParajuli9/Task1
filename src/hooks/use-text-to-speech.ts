"use client";

import { useCallback, useEffect, useRef } from "react";

function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

export function useTextToSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          reject(new Error("Text-to-speech is not supported in this browser."));
          return;
        }

        const cleaned = stripForSpeech(text);
        if (!cleaned) {
          resolve();
          return;
        }

        cancel();

        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = 1;
        utterance.pitch = 1;
        const lang =
          typeof navigator !== "undefined" && navigator.language
            ? navigator.language
            : "en-US";
        utterance.lang = lang;

        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith(lang.split("-")[0]) && v.localService) ??
          voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ??
          voices[0];
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
          utteranceRef.current = null;
          resolve();
        };
        utterance.onerror = () => {
          utteranceRef.current = null;
          reject(new Error("Could not play speech."));
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [cancel],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      cancel();
    };
  }, [cancel]);

  return { speak, cancel, supported: typeof window !== "undefined" && "speechSynthesis" in window };
}
