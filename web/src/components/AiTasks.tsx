import { AlertTriangle, Check, Loader2, Square, X } from 'lucide-react';
import type { AiTaskItem } from '../api/tutor/context';

type Lang = 'ar' | 'en';

// What each task says in each state. `page` is the 1-based page number, when
// the task is about a page.
const TASK_TEXT: Record<string, Record<Lang, Record<AiTaskItem['status'], (page?: number) => string>>> = {
  'page-analysis': {
    en: {
      started: page => `Analyzing page ${page}`,
      completed: page => `Page ${page} analyzed`,
      failed: page => `Couldn't analyze page ${page}`,
      stopped: page => `Page ${page} analysis stopped`,
    },
    ar: {
      started: page => `جارٍ تحليل الصفحة ${page}`,
      completed: page => `تم تحليل الصفحة ${page}`,
      failed: page => `تعذّر تحليل الصفحة ${page}`,
      stopped: page => `أُوقف تحليل الصفحة ${page}`,
    },
  },
};

// Any other task type, until it gets its own wording above.
const GENERIC_TEXT: Record<Lang, Record<AiTaskItem['status'], string>> = {
  en: { started: 'AI task in progress', completed: 'AI task done', failed: 'AI task failed', stopped: 'AI task stopped' },
  ar: { started: 'مهمة قيد التنفيذ', completed: 'اكتملت المهمة', failed: 'تعذّر إكمال المهمة', stopped: 'أُوقفت المهمة' },
};

function taskText(task: AiTaskItem, lang: Lang): string {
  const page = task.pageIndex !== undefined ? task.pageIndex + 1 : undefined;
  return TASK_TEXT[task.task]?.[lang][task.status](page) ?? GENERIC_TEXT[lang][task.status];
}

const STATUS_ICON = {
  started: <Loader2 className='panel-task-icon spin' strokeWidth={2.25} aria-hidden='true' />,
  completed: <Check className='panel-task-icon' strokeWidth={2.5} aria-hidden='true' />,
  failed: <AlertTriangle className='panel-task-icon' strokeWidth={2.25} aria-hidden='true' />,
  stopped: <Square className='panel-task-icon' fill='currentColor' strokeWidth={0} aria-hidden='true' />,
};

// The AI's background tasks, under the options message: a small bubble each,
// showing what it's doing and how it went. A running task can be stopped;
// once it's over (done, failed or stopped) it can be dismissed.
export default function AiTasks({
  tasks,
  lang,
  onStop,
  onDismiss,
}: {
  tasks: AiTaskItem[];
  lang: Lang;
  onStop: (task: AiTaskItem) => void;
  onDismiss: (key: string) => void;
}) {
  if (tasks.length === 0) return null;
  const en = lang === 'en';

  return (
    <div className='panel-tasks' aria-live='polite'>
      {tasks.map(task => (
        <div key={task.key} className={`panel-task is-${task.status}`}>
          {STATUS_ICON[task.status]}
          <span className='panel-task-text'>{taskText(task, lang)}</span>
          {task.status === 'started' ? (
            <button
              className='panel-task-btn'
              onClick={() => onStop(task)}
              aria-label={en ? 'Stop' : 'إيقاف'}
              title={en ? 'Stop' : 'إيقاف'}
            >
              <Square fill='currentColor' strokeWidth={0} />
            </button>
          ) : (
            <button
              className='panel-task-btn'
              onClick={() => onDismiss(task.key)}
              aria-label={en ? 'Dismiss' : 'إخفاء'}
              title={en ? 'Dismiss' : 'إخفاء'}
            >
              <X strokeWidth={2.5} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
