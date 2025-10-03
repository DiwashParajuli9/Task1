"use client";

import { useEffect, useRef } from "react";

export function useChatScroll(messageCount: number, isLoading: boolean) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount, isLoading]);

  return { bottomRef, containerRef };
}
