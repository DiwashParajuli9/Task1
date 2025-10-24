"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMimeType, isVoiceRecordingSupported } from "@/lib/voice/recorder";
import { transcribeAudioBlob } from "@/lib/voice/transcribe-audio";

const MAX_RECORD_MS = 60_000;

export function useSpeechInput(onTranscript: (text: string) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isVoiceRecordingSupported());
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      setTranscribing(true);
      try {
        const text = await transcribeAudioBlob(blob);
        if (text) {
          onTranscript(text);
        } else {
          setError("No speech detected. Try again.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed");
      } finally {
        setTranscribing(false);
        stopStream();
      }
    },
    [onTranscript, stopStream],
  );

  const stop = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Voice needs HTTPS or localhost.");
      return;
    }

    if (!supported) {
      setError("Voice is not supported in this browser.");
      return;
    }

    if (transcribing) return;

    if (listening) {
      stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        setListening(false);
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < 100) {
          setError("No speech detected. Try again.");
          stopStream();
          return;
        }
        void transcribeBlob(blob);
      };

      recorder.onerror = () => {
        setError("Recording failed. Try again.");
        setListening(false);
        stopStream();
      };

      recorder.start();
      setListening(true);

      stopTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORD_MS);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone blocked. Allow mic access in browser settings.");
      } else {
        setError("Could not start microphone. Try again.");
      }
      stopStream();
      setListening(false);
    }
  }, [supported, transcribing, listening, stop, transcribeBlob, stopStream]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopStream();
    };
  }, [stopStream]);

  return {
    supported,
    listening,
    transcribing,
    error,
    start,
    stop,
    clearError: () => setError(null),
  };
}
