"use client";

import {
  LogOut,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeft,
  Settings,
  Trash2,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ChatSummary } from "@/types";
import { cn } from "@/lib/utils";
import { SettingsModal } from "./settings-modal";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  chats: ChatSummary[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function Sidebar({ chats, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const userLabel = mounted
    ? (session?.user?.name ?? session?.user?.email ?? "Sign out")
    : "Sign out";

  async function newChat() {
    const res = await fetch("/api/chats", { method: "POST" });
    if (res.ok) {
      const chat = await res.json();
      router.push(`/c/${chat.id}`);
      onMobileClose?.();
    }
  }

  async function deleteChat(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    if (pathname.includes(id)) router.push("/");
    router.refresh();
  }

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 md:relative",
          collapsed ? "w-[68px]" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-3">
          {!collapsed && (
            <span className="font-semibold text-zinc-100">AI Chat</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 md:block"
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={newChat}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-500",
              collapsed && "justify-center px-2",
            )}
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>New chat</span>}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {chats.map((chat) => {
            const active = pathname === `/c/${chat.id}`;
            return (
              <Link
                key={chat.id}
                href={`/c/${chat.id}`}
                onClick={onMobileClose}
                className={cn(
                  "group mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                  collapsed && "justify-center px-2",
                )}
              >
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{chat.title}</span>
                    <button
                      type="button"
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-zinc-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-2 space-y-1">
          <ThemeToggle collapsed={collapsed} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900",
              collapsed && "justify-center",
            )}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900",
              collapsed && "justify-center",
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && (
              <span className="truncate">{userLabel}</span>
            )}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-label="Close sidebar"
        />
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
