import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';
import { mapStep, StepE, StepM } from './Step.js';
import { AgentLine, BoardContentType } from '../server/types.js';

export type TaskE<InputT = Record<string, any>, OutputT = Record<string, any>> = {
    pk: ItemPK;
    data: {
        type: 'text-steps' | 'step-processing' | 'tts-prepare' | 'validate-board' | 'pre-tts' | 'tts' | 'uploaded-image'
        status?: 'pending' | 'completed' | 'canceled'
        predecessorUids?: string[]
        input?: InputT
        output?: OutputT
    };
    meta: MetaData
    links: {
    };
    childs: {
        steps: StepE[]
    };
};


export enum TaskLinkKeys {
}

export enum TaskChildsKeys {
    steps = "steps"
}


export type TaskM = TaskE['data'] & TaskE['meta'] & {
    uid: string;
    taskGroupUid: string;
    steps?: StepM[]
};

export const mapTask = (item: TaskE) => {

    const uid = UID_SCHEMA.tasks.toUid(item.pk)
    const map: TaskM = {
        ...item.data,
        uid,
        taskGroupUid: item.pk.parent?.id!,
        steps: item.childs?.steps ? item.childs?.steps.map(mapStep) : undefined,
    };

    return map;
};


export type TextStepsInput = {
    bookUid?: string
    pageIndex?: number
    stepUid?: string
    userReqType?: 'clarify-part' | 'clarify-concept' | 'clarify-question' | 'options' | 'audio'
    userText?: string
    userAudioChunks?: string[]
    instructions?: string
    assistant?: string
    mode?: 'options'
}

export type TextStepsOutput = {
    steps: TextStepOutputChunk[];
    options?: string[]
}

export type TextStepOutputChunk = {
    stepIndex: number, 
    stepId: string, 
    language: 'ar' | 'en', 
    textToSay: string, 
    boardContent?: {
        type: BoardContentType,
        richHtmlWithSVGAndMathML: string;
    },
}
export type TextStepInput = TextStepOutputChunk & {
}

export type TextStepOutput = {
    textToSay?: string;
    streamId: string;
    wordsIds: string[], 
    options: string[], 
}


export type TTSPrepareInput = {
    text: string
}

export type ValidateBoardInput = {
    html: string;
}

export type PreTTSInput = {
    // language: string;
    text: string;
}
export type PreTTSOutput = {
    text: string;
    cc: string;
}

export type TTSInput = {
    text: string,
    // cc: string,
    // stepId: string,
    // wordsIds: string[],
    // options: string[]
    // boardData?: {type: BoardContentType, content: any}
}


export type UploadedImageInput = {
    uploadUid: string,
}