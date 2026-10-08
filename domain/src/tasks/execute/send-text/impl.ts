import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../../context.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { PreTTS } from '../../pre-tts/index.js';
import { OpenaiSendText } from '../../../openai/index.js';
import { OnTextStepChunk } from '../../helpers/index.js';
import { StartTask } from '../../start/index.js';
import { UpdateTask } from '../../update/index.js';
import { Def, serviceName } from './def.js';
import { TextStepInput, TextStepsOutput } from '../../../entities/Task.js';
import { CheckCompletion } from '../../helpers/check-completion/index.js';
import { GeminiSendText } from '../../../index.js';

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
                openaiSendText: Service<OpenaiSendText>;
                geminiSendText: Service<GeminiSendText>;
                preTTS: Service<PreTTS>;
                updateTask: Service<UpdateTask>;
                onTextStepChunk: Service<OnTextStepChunk>;
                checkCompletion: Service<CheckCompletion>;
        },
) =>
        createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {

                // const {task, taskGroup} = (await depends.getTask({ uid: params.taskUid, include: ["taskGroup"] }, scope)).data

                const {output} = (await depends.openaiSendText({
                        taskUid: params.taskUid,
                    }, scope)).data
                //     const {output} = (await depends.geminiSendText({
                //             taskUid: params.taskUid,
                //         }, scope)).data
                
                // const step = {
                //         stepId: "0",
                //         language: "ar" as 'ar' | 'en',
                //         textToSay: "Hi hello",
                //         stepIndex: 0,
                        
                // }
                // await depends.onTextStepChunk({
                //         type: "step",
                //         taskUid: params.taskUid,
                //         conversationUid: taskGroup?.conversationUid!,
                //         chunk: step
                // }, scope)

                // const output: TextStepsOutput = {
                //         options: [],
                //         steps: [step]
                // }

                await depends.updateTask({
                        uid: params.taskUid,
                        status: "completed",
                        output,
                }, scope)


                await depends.checkCompletion({
                        taskUid: params.taskUid
                }, scope)

                return {
                };
        });
