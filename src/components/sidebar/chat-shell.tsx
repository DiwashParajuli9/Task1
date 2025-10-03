"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import type { ChatSummary } from "@/types";
import { Sidebar } from "./sidebar";

export function ChatShell({
  chats,
  children,
}: {
  chats: ChatSummary[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <Sidebar
        chats={chats}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">AI Chat</span>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
