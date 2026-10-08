import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import he from 'he';
import { Context } from '../../../context.js';
import { TextStepsOutput } from '../../../entities/Task.js';
import { findTaskPath } from '../../../functions/find-task-path.js';
import { removeTashkeel } from '../../../functions/others.js';
import { CreateTask } from '../../create/index.js';
import { generateStreamId } from '../../execute/process-text-step/impl.js';
import { GetTask } from '../../get/index.js';
import { PreTTS } from '../../pre-tts/index.js';
import { StartTask } from '../../start/index.js';
import { Def, serviceName } from './def.js';
import { UpdateTaskGroup } from '../../../task-groups/index.js';

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
        updateTaskGroup: Service<UpdateTaskGroup>;
    },
) =>
    createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {
        
        const {task, taskGroup} = (await depends.getTask({uid: params.taskUid, include: ["taskGroup"]}, scope)).data
        const paths = findTaskPath(task, taskGroup?.tasks!)
        const pendingTasks = taskGroup!.tasks.filter(t => t.status != "completed" && t.status != "canceled")

        console.log(taskGroup!.tasks.map(t => ({type:t.type, status: t.status})), "####")
        // if(pendingTasks.length === 0 && taskGroup!.tasks.filter(t => t.type == "step-processing").length > 0){
        if(pendingTasks.length === 0){
                // need to reload, we need to make it wait until whole text-steps completed, then reload.


            await depends.updateTaskGroup({
                    uid: task.taskGroupUid,
                    status: "completed",
            }, scope)
            
            const textStepsTask = paths.flat().find(t => t.type == "text-steps")
            const textStepsTaskOutput = textStepsTask?.output as TextStepsOutput
            if(textStepsTaskOutput.options) {

                    const streamId = generateStreamId()

                    await context.sendToClient(scope, {
                            event: "new-audio-stream",
                            requestId: taskGroup?.clientRequestId,
                            streamId,
                            options: textStepsTaskOutput.options.map((opt: string) => {
                            opt = he.decode(opt);
                            return removeTashkeel(opt)
                            }),
                    })
            }
            await context.sendToClient(scope, {
                    event: "ai-agent-status",
                    status: 'ready',
            })
    }
        
        return {
                output: {
                },
        };
    });
