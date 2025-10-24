"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMimeType, isVoiceRecordingSupported } from "@/lib/voice/recorder";
import { transcribeAudioBlob } from "@/lib/voice/transcribe-audio";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

export type VoicePhase =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking";

const SILENCE_RMS = 0.018;
const SPEECH_RMS = 0.028;
const SILENCE_MS = 1200;
const MIN_SPEECH_MS = 450;
const MAX_UTTERANCE_MS = 45_000;
const VAD_INTERVAL_MS = 80;

type Options = {
  enabled: boolean;
  onSend: (text: string) => void;
  isLoading: boolean;
  assistantMessageId?: string;
  assistantText: string;
};

export function useVoiceMode({
  enabled,
  onSend,
  isLoading,
  assistantMessageId,
  assistantText,
}: Options) {
  const { speak, cancel: cancelSpeech, supported: ttsSupported } = useTextToSpeech();

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingRef = useRef(false);
  const speechStartedAtRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const awaitingReplyRef = useRef(false);
  const enabledRef = useRef(enabled);
  const wasEnabledRef = useRef(false);
  const phaseRef = useRef<VoicePhase>("idle");
  const isLoadingRef = useRef(isLoading);

  enabledRef.current = enabled;
  isLoadingRef.current = isLoading;

  const setPhaseSafe = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopVadLoop = useCallback(() => {
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  }, []);

  const stopRecorder = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recordingRef.current = false;
    speechStartedAtRef.current = null;
    silenceStartedAtRef.current = null;
  }, []);

  const releaseMic = useCallback(() => {
    stopVadLoop();
    stopRecorder();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
    recorderRef.current = null;
  }, [stopRecorder, stopVadLoop]);

  const getRms = useCallback((): number => {
    const analyser = analyserRef.current;
    const data = dataArrayRef.current;
    if (!analyser || !data) return 0;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = (data[i] - 128) / 128;
      sum += sample * sample;
    }
    return Math.sqrt(sum / data.length);
  }, []);

  const processRecording = useCallback(
    async (blob: Blob) => {
      if (blob.size < 120) {
        if (enabledRef.current && !isLoadingRef.current) setPhaseSafe("listening");
        return;
      }

      setPhaseSafe("transcribing");
      try {
        const text = await transcribeAudioBlob(blob);
        if (!text) {
          setError("No speech detected. Keep talking…");
          if (enabledRef.current && !isLoadingRef.current) setPhaseSafe("listening");
          return;
        }
        setError(null);
        awaitingReplyRef.current = true;
        onSend(text);
        setPhaseSafe("thinking");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed");
        if (enabledRef.current && !isLoadingRef.current) setPhaseSafe("listening");
      }
    },
    [onSend, setPhaseSafe],
  );

  const finishUtterance = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recordingRef.current = false;
    speechStartedAtRef.current = null;
    silenceStartedAtRef.current = null;
    recorder.stop();
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recordingRef.current) return;

    chunksRef.current = [];
    const mimeType = pickRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onerror = () => {
      setError("Recording failed.");
      recordingRef.current = false;
    };
    recorder.onstop = () => {
      recordingRef.current = false;
      speechStartedAtRef.current = null;
      silenceStartedAtRef.current = null;
      const mimeType = recorder.mimeType || pickRecorderMimeType() || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      void processRecording(blob);
    };

    recorderRef.current = recorder;
    recorder.start();
    recordingRef.current = true;
    speechStartedAtRef.current = Date.now();
    silenceStartedAtRef.current = null;
  }, [processRecording]);

  const runVadTick = useCallback(() => {
    if (!enabledRef.current || phaseRef.current !== "listening") {
      return;
    }

    const rms = getRms();
    const now = Date.now();

    if (!recordingRef.current) {
      if (rms >= SPEECH_RMS) {
        startRecording();
      }
      return;
    }

    const speechMs = speechStartedAtRef.current
      ? now - speechStartedAtRef.current
      : 0;

    if (speechMs > MAX_UTTERANCE_MS) {
      void finishUtterance();
      return;
    }

    if (rms < SILENCE_RMS) {
      if (!silenceStartedAtRef.current) silenceStartedAtRef.current = now;
      const silenceMs = now - silenceStartedAtRef.current;
      if (silenceMs >= SILENCE_MS && speechMs >= MIN_SPEECH_MS) {
        void finishUtterance();
      }
    } else {
      silenceStartedAtRef.current = null;
    }
  }, [finishUtterance, getRms, startRecording]);

  const startSession = useCallback(async () => {
    setError(null);
    if (!isVoiceRecordingSupported()) {
      setError("Voice is not supported in this browser.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Voice needs HTTPS or localhost.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;

      stopVadLoop();
      vadTimerRef.current = setInterval(runVadTick, VAD_INTERVAL_MS);
      setPhaseSafe("listening");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone blocked. Allow mic access in browser settings.");
      } else {
        setError("Could not start microphone.");
      }
      releaseMic();
      setPhaseSafe("idle");
    }
  }, [releaseMic, runVadTick, setPhaseSafe, stopVadLoop]);

  useEffect(() => {
    if (!enabled) {
      if (wasEnabledRef.current) {
        wasEnabledRef.current = false;
        cancelSpeech();
        releaseMic();
        awaitingReplyRef.current = false;
        setPhaseSafe("idle");
        setError(null);
      }
      return;
    }

    if (!wasEnabledRef.current) {
      wasEnabledRef.current = true;
      lastSpokenIdRef.current = assistantMessageId ?? null;
      void startSession();
    }
  }, [
    enabled,
    assistantMessageId,
    startSession,
    releaseMic,
    cancelSpeech,
    setPhaseSafe,
  ]);

  useEffect(() => {
    if (!enabled) return;

    if (isLoading) {
      stopRecorder();
      if (phaseRef.current !== "speaking") {
        setPhaseSafe("thinking");
      }
      return;
    }

    if (
      awaitingReplyRef.current &&
      assistantMessageId &&
      assistantMessageId !== lastSpokenIdRef.current &&
      assistantText.trim() &&
      ttsSupported
    ) {
      awaitingReplyRef.current = false;
      lastSpokenIdRef.current = assistantMessageId;
      stopRecorder();
      setPhaseSafe("speaking");

      void speak(assistantText)
        .catch(() => {
          /* TTS optional; continue listening */
        })
        .finally(() => {
          if (enabledRef.current) {
            setPhaseSafe("listening");
          } else {
            setPhaseSafe("idle");
          }
        });
      return;
    }

    if (phaseRef.current === "thinking" && !awaitingReplyRef.current) {
      setPhaseSafe("listening");
    }
  }, [
    enabled,
    isLoading,
    assistantMessageId,
    assistantText,
    speak,
    ttsSupported,
    stopRecorder,
    setPhaseSafe,
  ]);

  const supported = mounted && isVoiceRecordingSupported();

  return {
    supported,
    ttsSupported: mounted && ttsSupported,
    phase,
    error,
    clearError: () => setError(null),
    stopSpeaking: cancelSpeech,
  };
}
