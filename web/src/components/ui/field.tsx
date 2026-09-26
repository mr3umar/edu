import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-[14px] text-text placeholder:text-text-faint outline-none transition-colors focus:border-accent-600 disabled:opacity-60';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}
