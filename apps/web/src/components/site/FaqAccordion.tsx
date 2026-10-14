import type { Faq } from '@padel/shared';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function FaqAccordion({ items }: { items: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={cn(
              'overflow-hidden rounded-2xl border bg-surface transition-colors',
              isOpen ? 'border-primary/40' : 'border-line hover:border-line-strong',
            )}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-content sm:text-base">{item.question}</span>
              <ChevronDown
                className={cn('h-5 w-5 shrink-0 text-accent transition-transform', isOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <p className="animate-fade-in border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">
                {item.answer}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
