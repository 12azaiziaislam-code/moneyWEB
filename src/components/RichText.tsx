/**
 * Safe rich-text renderer for model answers.
 * Supports **bold**, bullet lists and headings — no HTML injection, ever.
 */

import type { ReactNode } from 'react';

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${index}`} className="font-bold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-t-${index}`}>{part}</span>;
  });
}

export function RichText({ text }: { text: string }) {
  const lines = (text ?? '').split('\n');
  return (
    <div className="space-y-2 text-[14.5px] leading-relaxed text-fg/95">
      {lines.map((rawLine, index) => {
        const line = rawLine.trimEnd();
        const key = `l-${index}`;
        if (!line.trim()) return <div key={key} className="h-2" />;
        if (/^#{1,6}\s/.test(line)) {
          return (
            <p key={key} className="pt-2 text-sm sm:text-base font-bold text-fg font-display">
              {inline(line.replace(/^#{1,6}\s*/, ''), key)}
            </p>
          );
        }
        if (/^[-•*]\s+/.test(line)) {
          return (
            <div key={key} className="flex items-start gap-2.5 ps-1 py-0.5">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0" />
              <p className="flex-1 leading-relaxed">{inline(line.replace(/^[-•*]\s+/, ''), key)}</p>
            </div>
          );
        }
        const numbered = /^(\d{1,2})[.)]\s+/.exec(line);
        if (numbered) {
          return (
            <div key={key} className="flex items-start gap-2.5 ps-1 py-0.5">
              <span className="font-bold text-accent shrink-0 text-xs mt-0.5">{numbered[1]}.</span>
              <p className="flex-1 leading-relaxed">{inline(line.replace(/^\d{1,2}[.)]\s+/, ''), key)}</p>
            </div>
          );
        }
        return <p key={key} className="leading-relaxed">{inline(line, key)}</p>;
      })}
    </div>
  );
}
