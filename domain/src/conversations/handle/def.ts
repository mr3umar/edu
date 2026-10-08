import { ConversationE } from "../../entities/Conversation.js";
import { MessageE } from "../../entities/Message.js";

export const serviceName = 'handleMsg';
export type Def = {
    Params: {
        conversationUid: string;
        requestId: string;
        language: ConversationE['data']["language"];
        bookUid?: MessageE['data']["bookUid"];
        pageIndex?: MessageE['data']["pageIndex"];
        stepId?: MessageE['data']["stepUid"];
        event?: 'audio' | 'json' | 'cancel' | 'pause' | 'resume';
        recordingId?: boolean;
        preroll?: boolean;
        data?: string
        ended?: boolean;
        avgIsSpeech: number; //0 to 1: Average speech probability across the frames in that chunk, rounded to 3 decimals
        /*
        - 0 dBFS is that maximum, so real audio is always below it, which means negative.
        - Closer to 0 is louder: −20 is louder than −40.
        - −100 is the floor I set for complete silence.
        - Every 6 dB lower is about half as loud (in signal strength), so −30 is about half of −24.

loudnessDbfs │                           What it usually means                            │
├──────────────┼────────────────────────────────────────────────────────────────────────────┤
│ −10 to −20   │ Very loud or very close to the mic; near −3 or above risks distortion      │
├──────────────┼────────────────────────────────────────────────────────────────────────────┤
│ −20 to −35   │ Normal speech from someone at the device                                   │
├──────────────┼────────────────────────────────────────────────────────────────────────────┤
│ −35 to −50   │ Quiet speech, or someone/something farther away, like a TV across the room │
├──────────────┼────────────────────────────────────────────────────────────────────────────┤
│ below −50    │ Background noise or near silence

        */
        loudnessDbfs: number; //-100 to 0: Average volume of the chunk's audio, rounded to 1 decimal
    };
    Data: {
        success: boolean
    };
    ErrorCodes: never;
};
