import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../../context.js';
import { PreTTSOutput, TextStepInput, TextStepOutput, TextStepsOutput } from '../../../entities/Task.js';
import { findTaskPath } from '../../../functions/find-task-path.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { GrokTTS } from '../../../grok/tts/index.js';
import { StartTask } from '../../start/index.js';
import { UpdateTask } from '../../update/index.js';
import { Def, serviceName } from './def.js';
import { generateStreamId } from '../process-text-step/impl.js';
import { removeTashkeel } from '../../../functions/others.js';
import he from 'he';
import { delayPromise } from '../../../functions/delay-promise.js';
import { CheckCompletion } from '../../helpers/check-completion/index.js';


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
                grokTTS: Service<GrokTTS>;
                updateTask: Service<UpdateTask>;
                checkCompletion: Service<CheckCompletion>;
        },
) =>
        createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {

                const {task, taskGroup} = (await depends.getTask({uid: params.taskUid, include: ["taskGroup"]}, scope)).data

                // const input = task.input as StepChunkInput
        
                const paths = findTaskPath(task, taskGroup?.tasks!)
                
                const textStepTask = paths.flat().find(t => t.type == "step-processing")
                const textStepInput = textStepTask?.input as TextStepInput
                const textStepOutput = textStepTask?.output as TextStepOutput

                const preTTSTask = paths.flat().find(t => t.type == "pre-tts")
                const preTTSOutput = preTTSTask?.output as PreTTSOutput

                await context.sendToClient(scope, {
                        event: "new-audio-stream",
                        requestId: taskGroup?.clientRequestId,
                        streamId: textStepOutput.streamId,
                        stepId: textStepInput.stepId,
                        wordsIds: textStepOutput.wordsIds,
                        boardData: {
                                type: "general",
                                content: {
                                        html: textStepInput.boardContent?.richHtmlWithSVGAndMathML
                                }
                        },
                        options: (textStepOutput.options ?? []).map(opt => ({ content: opt })),
                        text: preTTSOutput.cc,
                });

                const { output } = (
                        await depends.grokTTS({
                                taskUid: params.taskUid,
                        }, scope)).data

                await depends.updateTask({
                        uid: params.taskUid,
                        status: "completed",
                        output,
                }, scope)

                await depends.checkCompletion({
                        taskUid: params.taskUid
                }, scope)

                return {};
        });
