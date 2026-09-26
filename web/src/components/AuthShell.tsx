import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

type AppLang = 'ar' | 'en';

export function AuthShell({
  lang,
  onLangChange,
  brand,
  children,
}: {
  lang: AppLang;
  onLangChange: (lang: AppLang) => void;
  brand: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="absolute end-4 top-4">
        <div className="flex items-center rounded-full border border-border bg-surface-2 p-0.5">
          <button
            onClick={() => onLangChange('ar')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              lang === 'ar' ? 'bg-accent-600 text-accent-foreground' : 'text-text-muted hover:text-text'
            )}
          >
            AR
          </button>
          <button
            onClick={() => onLangChange('en')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              lang === 'en' ? 'bg-accent-600 text-accent-foreground' : 'text-text-muted hover:text-text'
            )}
          >
            EN
          </button>
        </div>
      </div>

      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-600 text-accent-foreground">
            <Sparkles className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <p className="text-[15px] font-semibold text-text">{brand}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-7 shadow-e2">{children}</div>
      </div>
    </div>
  );
}
