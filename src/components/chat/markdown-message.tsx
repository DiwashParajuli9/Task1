"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./code-block";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className ?? "");
          const text = String(children).replace(/\n$/, "");
          const inline = !match && !text.includes("\n");
          if (inline) {
            return (
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-emerald-300">
                {children}
              </code>
            );
          }
          return <CodeBlock language={match?.[1]}>{text}</CodeBlock>;
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-7">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 list-disc pl-6">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 list-decimal pl-6">{children}</ol>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              className="text-emerald-400 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
