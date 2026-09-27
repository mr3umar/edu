import { createContext } from 'react';
import type { AiAgentStatus, BoardData, Message } from '../../types/book';
import type { AiTask } from '../books';

// A task in the panel's list: identified by task + page, as the backend's
// 'ai-task' messages carry no id of their own.
export type AiTaskItem = AiTask & { key: string };

export type TutorContextType = {
  isBoardOpen: boolean,
  setIsBoardOpen: React.Dispatch<React.SetStateAction<boolean>>,
  // Set by the panel while it's minimized: the board is open but hidden.
  setIsBoardHidden: (hidden: boolean) => void,
  boardContent: BoardData | undefined,
  // Closed caption for the stream being heard.
  captionText: string | undefined,
  // Background tasks the AI is running (or just finished), for the panel.
  aiTasks: AiTaskItem[],
  stopAiTask: (task: AiTaskItem) => void,
  dismissAiTask: (key: string) => void,
  messages: Message<any>[],
  aiStatus: AiAgentStatus,
  // True while the mic is starting (its button waits).
  micStarting: boolean,
  startMic: () => Promise<void>,
  stopMic: () => Promise<void>,
  cancelRequest: () => Promise<void>,
  // Pause / resume the answer that's playing, here and on the backend.
  pauseRequest: () => Promise<void>,
  resumeRequest: () => Promise<void>,
};

export const TutorContext =
  createContext<TutorContextType | null>(null);
