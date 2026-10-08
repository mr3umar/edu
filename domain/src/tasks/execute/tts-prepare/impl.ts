import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../../context.js';
import { PreTTSInput, TextStepInput } from '../../../entities/Task.js';
import { findTaskPath } from '../../../functions/find-task-path.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { PreTTS } from '../../pre-tts/index.js';
import { OpenaiTTSPrepare } from '../../../openai/tts-prepare/index.js';
import { StartTask } from '../../start/index.js';
import { UpdateTask } from '../../update/index.js';
import { Def, serviceName } from './def.js';

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
                openaiTTSPrepare: Service<OpenaiTTSPrepare>;
                preTTS: Service<PreTTS>;
                updateTask: Service<UpdateTask>;
        },
) =>
        createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {

                const {task, taskGroup} = (await depends.getTask({ uid: params.taskUid, include: ["taskGroup"] }, scope)).data

                const input = task.input! as TextStepInput

                
            // const input = task.input as TTSPrepareInput
            const paths = findTaskPath(task, taskGroup?.tasks!)
                const textStepTask = paths.flat().find(t => t.type == "step-processing")
            const textStepInput = textStepTask?.input as TextStepInput

            const {output} = (
                await depends.openaiTTSPrepare({
                    taskUid: params.taskUid,
                }, scope)).data

            const nextInput: PreTTSInput = {
                    text: output.text,
            }
            const taskRes = (await depends.createTask({
                        taskGroupUid: task.taskGroupUid,
                        predecessorUids: [task.uid],
                    type: 'pre-tts',
                    input: nextInput,
            }, scope)).data

            await depends.updateTask({
                uid: params.taskUid,
                status: "completed",
                output,
            }, scope)
            
            await depends.startTask({
                    taskUid: taskRes.uid
            }, scope)


                return {
                };
        });
