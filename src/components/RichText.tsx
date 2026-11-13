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
        <strong key={`${keyPrefix}-b-${index}`} className="font-bold">
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
    <div className="space-y-1.5 text-[15px] leading-relaxed">
      {lines.map((rawLine, index) => {
        const line = rawLine.trimEnd();
        const key = `l-${index}`;
        if (!line.trim()) return <div key={key} className="h-1.5" />;
        if (/^#{1,6}\s/.test(line)) {
          return (
            <p key={key} className="pt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
              {inline(line.replace(/^#{1,6}\s*/, ''), key)}
            </p>
          );
        }
        if (/^[-•*]\s+/.test(line)) {
          return (
            <div key={key} className="flex gap-2 ps-1">
              <span aria-hidden="true" className="text-brand-600">
                •
              </span>
              <p className="flex-1">{inline(line.replace(/^[-•*]\s+/, ''), key)}</p>
            </div>
          );
        }
        const numbered = /^(\d{1,2})[.)]\s+/.exec(line);
        if (numbered) {
          return (
            <div key={key} className="flex gap-2 ps-1">
              <span className="font-semibold text-brand-600">{numbered[1]}.</span>
              <p className="flex-1">{inline(line.replace(/^\d{1,2}[.)]\s+/, ''), key)}</p>
            </div>
          );
        }
        return <p key={key}>{inline(line, key)}</p>;
      })}
    </div>
  );
}
