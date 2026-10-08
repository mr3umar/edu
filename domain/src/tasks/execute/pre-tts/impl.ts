import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../../context.js';
import { TTSInput } from '../../../entities/Task.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { PreTTS } from '../../pre-tts/index.js';
import { OpenaiValidateBoard } from '../../../openai/validate-board/index.js';
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
                openaiValidateBoard: Service<OpenaiValidateBoard>;
                preTTS: Service<PreTTS>;
                updateTask: Service<UpdateTask>;
        },
) =>
        createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {
                
                const task = (await depends.getTask({uid: params.taskUid}, scope)).data.task

                const {output} = (
                        await depends.preTTS({
                                taskUid: params.taskUid,
                        }, scope)).data

                const nextInput: TTSInput = {
                        text: output.text,
                }
                const taskRes = (await depends.createTask({
                        taskGroupUid: task.taskGroupUid,
                        predecessorUids: [task.uid],
                        type: 'tts',
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
