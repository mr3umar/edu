import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../../context.js';
import { TextStepOutput } from '../../../entities/Task.js';
import { findTaskPath } from '../../../functions/find-task-path.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { PreTTS } from '../../pre-tts/index.js';
import { StartTask } from '../../start/index.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {
        getClientLanguage: Context.getClientLanguage
        sendToClient: Context.sendToClient
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

        // const input = task.input as StepChunkInput

        const paths = findTaskPath(task, taskGroup?.tasks!)
        const textStepTask = paths.flat().find(t => t.type == "step-processing")
        const textStepOutput = textStepTask?.output as TextStepOutput
        
        await context.sendToClient(scope, {
                event: "audio",
                requestId: taskGroup?.clientRequestId,
                data: params.chunk ? params.chunk.toString("base64") : undefined,
                wordsIds: textStepOutput.wordsIds,
                seq: params.chunkIndex,
                streamId: textStepOutput.streamId,
        });
        
        return {
                output: {
                },
        };
    });
