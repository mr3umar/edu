import { ArrowLeft } from 'lucide-react';

export function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6 sm:px-10">
      <button
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text rtl:-scale-x-100"
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      <p className="truncate text-[15px] font-semibold text-text">{title}</p>
    </header>
  );
}
