import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Image, LoaderCircle, Mic, Presentation, RefreshCw } from 'lucide-react';
import type { GetConversationLite } from '../domain';
import type { BoardData } from '../types/book';
import { getConversationLite } from '../api/rest/services/conversations';
import { getConversationUid } from '../api/conversation';
import { ApiError, errorMessage } from '../api/rest/apiError';
import { textDirection } from '../lib/textDirection';

type LiteMessage = GetConversationLite['Data']['messages'][number];
type Step = NonNullable<LiteMessage['assistant']>['steps'][number];

// One step of an answer, as the panel shows it when picked from the history:
// what the tutor said beside what it put on the board.
export type HistoryStep = {
  key: string;
  text: string;
  lang: 'ar' | 'en';
  board: BoardData | undefined;
};

// What the history lists: what the user sent, and the tutor's answers step by
// step. The rest (page images, analyses, instructions) is the tutor's own
// context, not part of the conversation as the user saw it.
type Entry =
  | { kind: 'user'; key: string; text: string | undefined; source: 'text' | 'audio' | 'image' }
  | { kind: 'step'; step: HistoryStep };

const toEntries = (messages: LiteMessage[]): Entry[] =>
  messages.flatMap((message): Entry[] => {
    switch (message.type) {
      case 'user-text':
        return message.userText ? [{ kind: 'user', key: message.uid, text: message.userText, source: 'text' }] : [];
      case 'user-audio':
        return [{ kind: 'user', key: message.uid, text: message.userText, source: 'audio' }];
      case 'user-uploaded-image':
        return [{ kind: 'user', key: message.uid, text: message.userText, source: 'image' }];
      case 'assistant':
        return (message.assistant?.steps ?? [])
          .filter((step: Step) => step.textToSay || step.boardContent?.richHtmlWithSVGAndMathML)
          .map((step: Step, i: number) => ({
            kind: 'step',
            step: {
              key: `${message.uid}:${step.stepId ?? i}`,
              text: step.textToSay,
              lang: step.language,
              // Every board kind comes back as its rendered HTML.
              board: step.boardContent?.richHtmlWithSVGAndMathML
                ? { type: 'html', content: { html: step.boardContent.richHtmlWithSVGAndMathML } }
                : undefined,
            },
          }));
      default:
        return [];
    }
  });

type Load =
  | { status: 'loading' }
  | { status: 'ready'; entries: Entry[] }
  | { status: 'error'; message: string };

const TEXT = {
  en: {
    title: 'Conversation',
    empty: 'No messages yet. Ask the tutor anything to get started.',
    loading: 'Loading conversation…',
    retry: 'Try again',
    voice: 'Voice message',
    image: 'Image',
    board: 'Has a board',
  },
  ar: {
    title: 'المحادثة',
    empty: 'لا توجد رسائل بعد. اسأل المعلم أي سؤال للبدء.',
    loading: 'جارٍ تحميل المحادثة…',
    retry: 'حاول مرة أخرى',
    voice: 'رسالة صوتية',
    image: 'صورة',
    board: 'يتضمن سبورة',
  },
};

type Props = {
  // Bumped each time the history is opened from the panel, to load it afresh.
  loadKey: number;
  lang: 'ar' | 'en';
  // The step last opened from here, to mark it and scroll back to it.
  selectedKey: string | undefined;
  onSelect: (step: HistoryStep) => void;
};

// The current conversation's messages, in the tutor panel in place of its
// caption and board. Picking one of the tutor's steps shows it there.
export default function ConversationHistory({ loadKey, lang, selectedKey, onSelect }: Props) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [retries, setRetries] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const t = TEXT[lang];

  useEffect(() => {
    if (loadKey === 0) return;
    const conversationUid = getConversationUid();
    // Nothing asked yet this session, so there's no conversation to load.
    if (!conversationUid) {
      setLoad({ status: 'ready', entries: [] });
      return;
    }

    let cancelled = false;
    // Keep what's showing while it reloads; only an empty list waits visibly.
    setLoad(current => (current.status === 'ready' && current.entries.length > 0 ? current : { status: 'loading' }));
    getConversationLite({ conversationUid }, {})
      .then(result => {
        if (cancelled) return;
        if (result.error) {
          throw new ApiError(result.error.code, result.error.description);
        }
        setLoad({ status: 'ready', entries: toEntries(result.data?.messages ?? []) });
      })
      .catch(err => {
        if (!cancelled) setLoad({ status: 'error', message: errorMessage(err, lang) });
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey, retries]);

  // Opens at the latest message, or back at the step that was opened from here.
  const entries = load.status === 'ready' ? load.entries : undefined;
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !entries) return;
    const selected = selectedKey
      ? list.querySelector<HTMLElement>(`[data-key="${CSS.escape(selectedKey)}"]`)
      : null;
    if (selected) selected.scrollIntoView({ block: 'nearest' });
    else list.scrollTop = list.scrollHeight;
  }, [entries, loadKey]);

  return (
    <div className='conv-history' aria-label={t.title} role='region'>
      {load.status === 'loading' && (
        <div className='conv-history-state' role='status'>
          <LoaderCircle className='conv-history-spinner' strokeWidth={2.25} aria-hidden='true' />
          {t.loading}
        </div>
      )}

      {load.status === 'error' && (
        <div className='conv-history-state' role='alert'>
          <span>{load.message}</span>
          <button type='button' className='conv-history-retry' onClick={() => setRetries(n => n + 1)}>
            <RefreshCw strokeWidth={2.25} aria-hidden='true' />
            {t.retry}
          </button>
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className='conv-history-state'>{t.empty}</div>
      )}

      {entries && entries.length > 0 && (
        <div ref={listRef} className='conv-history-list'>
          {entries.map(entry => entry.kind === 'user' ? (
            <div key={entry.key} className='conv-history-user' dir={entry.text ? textDirection(entry.text) : undefined}>
              {entry.source === 'audio' && <Mic className='conv-history-user-icon' strokeWidth={2.25} aria-label={t.voice} />}
              {entry.source === 'image' && <Image className='conv-history-user-icon' strokeWidth={2.25} aria-label={t.image} />}
              <span>{entry.text ?? (entry.source === 'audio' ? t.voice : t.image)}</span>
            </div>
          ) : (
            <button
              key={entry.step.key}
              type='button'
              data-key={entry.step.key}
              className={`conv-history-step ${entry.step.key === selectedKey ? 'selected' : ''}`}
              aria-current={entry.step.key === selectedKey ? 'true' : undefined}
              dir={entry.step.lang === 'en' ? 'ltr' : 'rtl'}
              onClick={() => onSelect(entry.step)}
            >
              <span className='conv-history-step-text'>{entry.step.text}</span>
              {entry.step.board && (
                <Presentation className='conv-history-step-board' strokeWidth={2} aria-label={t.board} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
