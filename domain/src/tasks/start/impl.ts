import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { GrokTTS } from '../../grok/tts/index.js';
import { OpenaiSendText } from '../../openai/index.js';
import { OpenaiTTSPrepare } from '../../openai/tts-prepare/index.js';
import { OpenaiValidateBoard } from '../../openai/validate-board/index.js';
import { GetTaskGroup } from '../../task-groups/index.js';
import { CreateTask } from '../create/index.js';
import { ExecutePreTTS } from '../execute/pre-tts/index.js';
import { ExecuteProcessTextStep } from '../execute/process-text-step/index.js';
import { ExecuteSendText } from '../execute/send-text/index.js';
import { ExecuteTTSPrepare } from '../execute/tts-prepare/index.js';
import { ExecuteTTS } from '../execute/tts/index.js';
import { ExecuteValidateBoard } from '../execute/validate-board/index.js';
import { GetTask } from '../get/index.js';
import { UpdateTask } from '../update/index.js';
import { Def, serviceName } from './def.js';
import { StartTask } from './index.js';
import { delayPromise } from '../../functions/delay-promise.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
        getOpenaiSession: Context.getOpenaiSession
        startTask: Context.startTask
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        getTask: Service<GetTask>;
        getTaskGroup: Service<GetTaskGroup>;
        updateTask: Service<UpdateTask>;
        openaiSendText: Service<OpenaiSendText>;
        // processTextStep: Service<ProcessTextStep>;
        openaiTTSPrepare: Service<OpenaiTTSPrepare>;
        createTask: Service<CreateTask>;
        startTask: Service<StartTask>;
        openaiValidateBoard: Service<OpenaiValidateBoard>;
        executeSendText: Service<ExecuteSendText>;
        executeProcessTextStep: Service<ExecuteProcessTextStep>;
        executeTTSPrepare: Service<ExecuteTTSPrepare>;
        executeValidateBoard: Service<ExecuteValidateBoard>;
        executePreTTS: Service<ExecutePreTTS>;
        executeTTS: Service<ExecuteTTS>;
        
    },
) =>
    createBaseService<Def>(serviceName, ['taskUid'], async (params, scope, errorout, warn) => {


        // TODO: this is workaround to dealy the exec after executor finish update task.
        // await delayPromise(1000);

        // const {task, taskGroup} = (await depends.getTask({uid: params.taskUid, include: ["taskGroup"]}, scope)).data
        // const {task, taskGroup, predecessors} = (await depends.getTaskGroup({uid: params.taskUid.split(":")[0], }, scope)).data

        await context.startTask(scope, params.taskUid)
        // switch(task.type) {
        //     case "text-steps":
                
        //         void depends.executeSendText({
        //             taskUid: params.taskUid
        //         }, scope)
        //         .catch((err: any) => {
        //             console.error(`cannot start task ${params.taskUid}. Error: ${err.message}`)
        //         })


        //         break;

        //     case "step-processing":

        //         void depends.executeProcessTextStep({taskUid: params.taskUid}, scope)
        //         .catch((err: any) => {
        //             console.error(`cannot start task ${params.taskUid}. Error: ${err.message}`)
        //         })

        //         break;

        //     case "tts-prepare":

        //         void depends.executeTTSPrepare({taskUid: params.taskUid}, scope)
        //         .catch((err: any) => {
        //             console.error(`cannot start task ${params.taskUid}. Error: ${err.message}`)
        //         })

        //         break;


        //     case "validate-board":

        //         void depends.executeValidateBoard({taskUid: params.taskUid}, scope)
        //         .catch((err: any) => {
        //             console.error(`cannot start task ${params.taskUid}. Error: ${err.message}`)
        //         })

        //     break;

        //     case "pre-tts":

        //         void depends.executePreTTS({taskUid: params.taskUid}, scope)
        //         .catch((err: any) => {
        //             console.error(`cannot start task ${params.taskUid}. Error: ${err.message}`)
        //         })

        //     break;

        //     case "tts":

        //         void depends.executeTTS({taskUid: params.taskUid}, scope)
        //         .catch((err: any) => {
        //             console.error(`cannot start task ${params.taskUid}. Error: ${err.message}`)
        //         })

        //     break;

        //     default: 
        //         throw errorout({
        //             code: 'UNSUPPORTED_TASK_TYPE'
        //         })
        // }
        
        return {
            succeed: true
        };
    });
