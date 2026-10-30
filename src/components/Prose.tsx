import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Показва Markdown текст от админа в стила на сайта. Суров HTML не се допуска. */
export function Prose({ children }: { children: string }) {
  return (
    <div className="max-w-3xl text-[16px] leading-relaxed text-text">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mb-4 mt-12 flex items-center gap-3 font-display text-[22px] uppercase tracking-wide text-white first:mt-0">
              <span className="marker" /> {children}
            </h2>
          ),
          h3: ({ children }) => <h3 className="mb-3 mt-8 font-display text-[18px] text-white">{children}</h3>,
          p: ({ children }) => <p className="my-4 text-muted">{children}</p>,
          ul: ({ children }) => <ul className="my-4 space-y-2 pl-5 text-muted marker:text-accent-ink [list-style:square]">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-5 text-muted marker:font-display marker:text-accent-ink">{children}</ol>,
          strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
          code: ({ children }) => <code className="bg-surface-2 px-1.5 py-0.5 font-mono text-[14px] text-white">{children}</code>,
          a: ({ href = "", children }) =>
            href.startsWith("/") ? (
              <Link href={href} className="text-white underline decoration-accent underline-offset-4 hover:text-accent-ink">
                {children}
              </Link>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline decoration-accent underline-offset-4 hover:text-accent-ink"
              >
                {children}
              </a>
            ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full text-left text-[15px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-line text-[12px] uppercase tracking-wide text-dim">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 font-normal">{children}</th>,
          td: ({ children }) => <td className="border-b border-line-soft px-3 py-2.5 text-muted first:text-text">{children}</td>,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
