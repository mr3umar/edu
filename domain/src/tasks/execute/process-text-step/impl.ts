import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import he from "he";
import { Context } from '../../../context.js';
import { PreTTSInput, TextStepInput, TextStepOutput, TTSPrepareInput, ValidateBoardInput } from '../../../entities/Task.js';
import { hasLettersOrNumbers } from '../../../functions/others.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { StartTask } from '../../start/index.js';
import { UpdateTask } from '../../update/index.js';
import { Def, serviceName } from './def.js';
import { PreTTS } from '../../helpers/index.js';

const wordRegexWithPrefixAndXmlTag = /(?:\[word\s*|<word\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/word\]|<\/word>|\[\/word>|<\/word\])/g;
const labelRegexWithPrefixAndXmlTag = /(?:\[label\s*|<label\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/label\]|<\/label>|\[\/label>|<\/label\])/g;
const optionRegexWithPrefixAndXmlTag = /(?:^|\s)?(?:\d+[\.\-)]?|[•*+\-])?\s*(?:\[option\s*|<option\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/option\]|<\/option>|\[\/option>|<\/option\])/g;
const attrRegex = /(\w+)=(?:\\)?"([^"]+)"/g;

let streamSeq = -1;

export const generateStreamId = () => String(++streamSeq)

export const createService = (
    context: {
        getClientLanguage: Context.getClientLanguage
        // getTaskAbortContoller: Context.getTaskAbortContoller,
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
        updateTask: Service<UpdateTask>;
    },
) =>
    createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {
        
        const task = (await depends.getTask({uid: params.taskUid}, scope)).data.task

        const input = task.input as TextStepInput
        let htmlForBoard = input.boardContent?.richHtmlWithSVGAndMathML

        // const abortSignal = await context.getTaskAbortContoller(scope, task.uid)

        const options: string[] = []

        const wordsIds: string[] = []
        {
        // let raw = textToSpeak.replace(
        //   tagRegex,
        //   (_, idVal, xVal, yVal, wVal, hVal, wordText) => {

        //     wordsIds.push(idVal)

        //     return wordText
        //   }
        // );
        // raw = raw.replace(
        //   tagRegex2,
        //   (_, idVal, wordText) => {

        //     wordsIds.push(idVal)

        //     return wordText
        //   }
        // );
        // if(wordsIds.length > 0) {

        //   wsClient.send(JSON.stringify({
        //           event: 'showLaser',
        //           wordsIds,
        //   }));
        // }
        }
        {
        // if (options.length > 0) {

        //   wsClient.send(JSON.stringify({
        //     event: 'showOptions',
        //     options: options.map(opt => ({ content: opt }))
        //   }));
        // }

        // lineToSay = lineToSay.replace(/<[^>]*>/g, '');
        }
        const lineToSay = he.decode(input.textToSay);
        
        let raw = lineToSay.replace(
                wordRegexWithPrefixAndXmlTag,
                (_, attrs, wordText) => {
                        const attributes: Record<string, string> = {};

                        let match;
                        while ((match = attrRegex.exec(attrs)) !== null) {
                                attributes[match[1]] = match[2];
                        }

                        if (attributes.id) {
                                wordsIds.push(attributes.id);
                        }

                        return wordText;
                }
        );
        raw = raw.replace(
                labelRegexWithPrefixAndXmlTag,
                (_, attrs, wordText) => {
                        return wordText;
                }
        );


        raw = raw.replace(
                optionRegexWithPrefixAndXmlTag,
                (_, attrs, text) => {
                        // const attributes: Record<string, string> = {};

                        // let match;
                        // while ((match = attrRegex.exec(attrs)) !== null) {
                        //   attributes[match[1]] = match[2];
                        // }

                        // if (attributes.id) {

                        text = he.decode(text);
                        options.push(text);
                        // }

                        return '';
                }
        );

        if (htmlForBoard) {

                const optionsIsEmpty = options.length == 0
                htmlForBoard = htmlForBoard.replace(
                        wordRegexWithPrefixAndXmlTag,
                        (_, attrs, wordText) => {

                                return wordText;
                        }
                );
                htmlForBoard = htmlForBoard.replace(
                        labelRegexWithPrefixAndXmlTag,
                        (_, attrs, wordText) => {

                                return wordText;
                        }
                );
                htmlForBoard = htmlForBoard.replace(
                        optionRegexWithPrefixAndXmlTag,
                        (_, attrs, text) => {
                                // const attributes: Record<string, string> = {};

                                // let match;
                                // while ((match = attrRegex.exec(attrs)) !== null) {
                                //   attributes[match[1]] = match[2];
                                // }

                                // if (attributes.id) {
                                // }

                                if (optionsIsEmpty) {
                                        text = he.decode(text);
                                        options.push(text);
                                }

                                return '';
                        }
                );
        }
        console.log(`wordsIds: ${wordsIds}, raw: ${raw}\n=======\n`)


        const streamId = generateStreamId()

        const output: TextStepOutput = {
                streamId,
                textToSay: hasLettersOrNumbers(raw) ? raw : undefined,
                wordsIds,
                options,
        }

        if(output.textToSay) {
                if(input.stepIndex !== 0) {
                        const nextInput: TTSPrepareInput = {
                                text: output.textToSay,
                        }
                        const taskRes = (await depends.createTask({
                                taskGroupUid: task.taskGroupUid,
                                predecessorUids: [task.uid],
                                type: 'tts-prepare',
                                input: nextInput,
                        }, scope)).data
                        await depends.startTask({
                                taskUid: taskRes.uid
                        }, scope)

                        if(htmlForBoard) {
                                const nextInput: ValidateBoardInput = {
                                        html: htmlForBoard
                                }
                                const taskRes = (await depends.createTask({
                                        taskGroupUid: task.taskGroupUid,
                                        predecessorUids: [task.uid],
                                        type: 'validate-board',
                                        input: nextInput,
                                }, scope)).data
                                await depends.startTask({
                                        taskUid: taskRes.uid
                                }, scope)
                        }
                }
                else {
                        console.log(">>>>>>>>0")
                        const nextInput: PreTTSInput = {
                                text: output.textToSay                        
                        }
                        const taskRes = (await depends.createTask({
                                taskGroupUid: task.taskGroupUid,
                                predecessorUids: [task.uid],
                                type: 'pre-tts',
                                input: nextInput,
                        }, scope)).data
                        await depends.startTask({
                                taskUid: taskRes.uid
                        }, scope)
                }
        }

        await depends.updateTask({
                uid: params.taskUid,
                status: "completed",
                output,
        }, scope)


        return {
                // output: {
                //         textToSay: raw,
                //         html: htmlForBoard && htmlForBoard?.length > 0,
                // },
        };
    });
