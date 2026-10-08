import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import he from "he";
import { Context } from '../../../context.js';
import { TextStepInput } from '../../../entities/Task.js';
import { hasLettersOrNumbers, removeTashkeel } from '../../../functions/others.js';
import { BoardContentType } from '../../../server/types.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { StartTask } from '../../start/index.js';
import { PreTTS } from '../../pre-tts/index.js';
import { Def, serviceName } from './def.js';

const wordRegexWithPrefixAndXmlTag = /(?:\[word\s*|<word\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/word\]|<\/word>|\[\/word>|<\/word\])/g;
const labelRegexWithPrefixAndXmlTag = /(?:\[label\s*|<label\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/label\]|<\/label>|\[\/label>|<\/label\])/g;
const optionRegexWithPrefixAndXmlTag = /(?:^|\s)?(?:\d+[\.\-)]?|[•*+\-])?\s*(?:\[option\s*|<option\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/option\]|<\/option>|\[\/option>|<\/option\])/g;
const attrRegex = /(\w+)=(?:\\)?"([^"]+)"/g;


export const createService = (
    context: {
        getClientLanguage: Context.getClientLanguage
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        getTask: Service<GetTask>;
        createTask: Service<CreateTask>;
        startTask: Service<StartTask>;
        preTTS: Service<PreTTS>;
    },
) =>
    createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {
        const {task, taskGroup} = (await depends.getTask({uid: params.taskUid, include: ["taskGroup"]}, scope)).data

        const chunk = params.chunk

        const input: TextStepInput = {
                stepIndex: chunk.stepIndex, 
                stepId: chunk.stepId, 
                language: chunk.language, 
                textToSay: chunk.textToSay,
                boardContent: chunk.boardContent,
        }
        const taskRes = (await depends.createTask({
                taskGroupUid: task.taskGroupUid,
                predecessorUids: [task.uid],
                type: 'step-processing',
                input,
        }, scope)).data
        await depends.startTask({
                taskUid: taskRes.uid
        }, scope)

        return {
        };
    });
