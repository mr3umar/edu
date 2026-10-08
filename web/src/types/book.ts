import type { LongDivisionContent, LongMultiplicationContent } from '../domain';
import type { PlaybackState } from "../audioStreamPlayer";
import type { SpeechProgress } from "../lib/captionTiming";
// export type PageBasic = {
//   pageNumber: string;
//   width: number;
//   height: number;
//   imageUrl: string;
// };

// export type Book = {
//   id: string;
//   language: string;
//   title: string;
//   pages: Page[];
// };

// export type Page = PageBasic & {
//   parts: any[],
//   words: {
//     "id": string,
//     "text": string,
//     "x": number,
//     "y": number,
//     "width": number,
//     "height": number,
//     "pixel_coordinates": {
//       "x": number,
//       "y": number
//     }
//   }[]
// }


export type Message<T> = {
  type: 'transcript' | 'options' | 'user',
  data: T
}

export type MessageOptionsData = {
  options: {
    text: string;
    isCorrect: boolean
  }[]
}


export type QuestionOption = {
  content: string
}

// Identifies the lesson step a stream (and its board) belongs to, as sent
// with 'new-audio-stream'. Sent back with every message while its board shows.
export type StepId = string | number

// What the whiteboard shows. Sent with a tutor's audio stream
// ('new-audio-stream'); `type` says how to read `content`.
export type BoardData =
  | { type: 'html', content: { html: string } }
  | { type: 'longDivision', content: LongDivisionContent }
  | { type: 'longMultiplication', content: LongMultiplicationContent }

// What the AI is doing. "ready" and "listening" are both idle: listening
// when the mic is on, ready when it's off. The mic has its own button.
// "paused": the answer is paused part-way and can be resumed.
export type AiAgentStatus = "ready" | "listening" | "thinking" | "speaking" | "paused"

export type Mic = {
  // Rejects when the mic can't be turned on (the browser's error).
  start: () => Promise<void>,
  stop: (muteOnly: boolean) => void,
  endPlayback: () => void,
  // The user cancelled the answer: stops it and drops the rest of it as it
  // arrives, until the user asks something new.
  cancelPlayback: () => void,
  // Pauses the tutor's speech in place; laser and board hold with it.
  stopPlaying: () => Promise<void>,
  resumePlaying: () => Promise<void>,
  // Skips to the next stream: keeps playing if it was, else waits paused there.
  playNextStream: () => void,
  // Pauses at the start of the previous stream.
  rewindStream: () => void,
  // 0.5–2, keeping the voice's pitch.
  setPlaybackRate: (rate: number) => void,
  getPlaybackRate: () => number,
  isPlaybackPaused: () => boolean,
  getPlaybackState: () => PlaybackState,
  // The backend won't send more streams for the current answer.
  answerComplete: () => void,
  // How far into the stream being heard the audio is (for the caption).
  getSpeechProgress: () => SpeechProgress | undefined,
  setDelegate: (delegate: MicDelegate) => void
}

export type MicDelegate = {
  onMicStatusChanged: (status: boolean) => void;
  onPlayingStatusChanged: (status: boolean) => void;
  onPlaybackStateChanged?: (state: PlaybackState) => void;
}