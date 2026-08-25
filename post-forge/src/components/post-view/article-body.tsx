import type { ReactNode } from "react";

/**
 * Editorial body renderer for the finished post (T12).
 *
 * `finalPost` is plain text with light markdown: blank-line-separated blocks,
 * optional `#`/`##`/`###` headings, `-`/`*`/`1.` lists, and inline `**bold**`.
 * Paragraphs render in the Newsreader serif to read like a real article;
 * headings switch to the UI sans (Geist) per the design's Post screen.
 */

/** Parse a single line's inline markup — currently just `**bold**`. */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const H_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^[-*]\s+/;
const OL_RE = /^\d+\.\s+/;

export function ArticleBody({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className="font-serif text-[19px] leading-[1.72] text-article">
      {blocks.map((block, i) => {
        const heading = block.match(H_RE);
        if (heading) {
          const level = heading[1].length;
          const content = renderInline(heading[2]);
          const cls =
            "font-sans font-semibold tracking-[-0.01em] text-ink mt-8 mb-1.5";
          if (level >= 3) {
            return (
              <h3 key={i} className={`${cls} text-[17px]`}>
                {content}
              </h3>
            );
          }
          return (
            <h2 key={i} className={`${cls} text-[20px]`}>
              {content}
            </h2>
          );
        }

        const lines = block.split("\n").map((l) => l.trim());
        if (lines.length > 0 && lines.every((l) => UL_RE.test(l))) {
          return (
            <ul key={i} className="mb-5 ml-5 list-disc space-y-1.5">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(UL_RE, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines.length > 0 && lines.every((l) => OL_RE.test(l))) {
          return (
            <ol key={i} className="mb-5 ml-5 list-decimal space-y-1.5">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(OL_RE, ""))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="mb-5">
            {renderInline(block.replace(/\n/g, " "))}
          </p>
        );
      })}
    </div>
  );
}
