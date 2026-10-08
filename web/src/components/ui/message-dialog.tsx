import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { useDocumentLang } from '../../lib/useDocumentLang';

// The app's standard message dialog: a title, a short explanation and one or
// more buttons, over the page. Shown from anywhere, React or not:
//
//   const choice = await showMessage({
//     tone: 'warning',
//     title: 'Microphone blocked',
//     description: 'Allow it in the browser, then try again.',
//     actions: [{ id: 'retry', label: 'Try again' }, { id: 'close', label: 'Close', variant: 'secondary' }],
//   });
//   if (choice === 'retry') ...
//
// It resolves with the chosen action's id, or undefined when dismissed
// (Escape, a tap outside). Messages asked for while one is showing wait their
// turn. <MessageDialogHost /> must be mounted once, at the app's root.

export type MessageTone = 'info' | 'success' | 'warning' | 'danger';

export type MessageAction = {
  id: string;
  label: string;
  // 'primary' by default; 'danger' for a destructive choice.
  variant?: 'primary' | 'secondary' | 'danger';
};

export type MessageOptions = {
  title: string;
  description?: ReactNode;
  tone?: MessageTone;
  // Replaces the tone's icon.
  icon?: LucideIcon;
  // Just an OK button when not given.
  actions?: MessageAction[];
  // Whether Escape or a tap outside closes it (default true).
  dismissible?: boolean;
};

type Pending = MessageOptions & { resolve: (id: string | undefined) => void };

let queue: Pending[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export function showMessage(options: MessageOptions): Promise<string | undefined> {
  return new Promise(resolve => {
    queue = [...queue, { ...options, resolve }];
    notify();
  });
}

function closeCurrent(id: string | undefined) {
  const [current, ...rest] = queue;
  if (!current) return;
  queue = rest;
  notify();
  current.resolve(id);
}

const TONES: Record<MessageTone, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: 'bg-accent-100 text-accent-700' },
  success: { icon: CheckCircle2, className: 'bg-success-bg text-success' },
  warning: { icon: AlertTriangle, className: 'bg-warning-bg text-warning' },
  danger: { icon: AlertCircle, className: 'bg-danger-bg text-danger' },
};

const VARIANT_CLASS: Record<NonNullable<MessageAction['variant']>, { variant: 'primary' | 'secondary'; className?: string }> = {
  primary: { variant: 'primary' },
  secondary: { variant: 'secondary' },
  danger: { variant: 'primary', className: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/90' },
};

export function MessageDialogHost() {
  const current = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    () => queue[0],
  );
  const isEnglish = useDocumentLang() === 'en';

  // Keep showing the last message while the dialog animates closed.
  const [shown, setShown] = useState(current);
  useEffect(() => { if (current) setShown(current); }, [current]);
  const message = current ?? shown;
  if (!message) return null;

  const tone = TONES[message.tone ?? 'info'];
  const Icon = message.icon ?? tone.icon;
  const actions = message.actions ?? [{ id: 'ok', label: isEnglish ? 'OK' : 'حسنًا' }];
  const dismissible = message.dismissible ?? true;

  return (
    <Dialog.Root open={!!current} onOpenChange={open => { if (!open) closeCurrent(undefined); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="message-dialog-overlay fixed inset-0 z-[400] bg-black/60" />
        <Dialog.Content
          onEscapeKeyDown={e => { if (!dismissible) e.preventDefault(); }}
          onPointerDownOutside={e => { if (!dismissible) e.preventDefault(); }}
          className="message-dialog fixed left-1/2 top-1/2 z-[400] w-[calc(100%-32px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-e3 focus:outline-none"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', tone.className)}>
              <Icon className="h-6 w-6" strokeWidth={2} />
            </div>

            <div className="min-w-0">
              <Dialog.Title className="text-[15px] font-semibold text-text">{message.title}</Dialog.Title>
              {message.description ? (
                <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-text-muted">
                  {message.description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{message.title}</Dialog.Description>
              )}
            </div>

            <div className="mt-1 flex w-full gap-2">
              {actions.map(action => {
                const style = VARIANT_CLASS[action.variant ?? 'primary'];
                return (
                  <Button
                    key={action.id}
                    variant={style.variant}
                    className={cn('flex-1', style.className)}
                    onClick={() => closeCurrent(action.id)}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
