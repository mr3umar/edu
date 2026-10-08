import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { GetBook } from '../../books/index.js';
import { Deferred } from '../../common/functions/deferred.js';
import { Context } from '../../context.js';
import { MessageE } from '../../entities/Message.js';
import { PageAnalysisM } from '../../entities/PageAnalysis.js';
import { TextStepsInput } from '../../entities/Task.js';
import { streamAudioToOpenAI } from '../../functions/openai/stt-openai.js';
import { hasLettersOrNumbers } from '../../functions/others.js';
// import { CreateMessage } from '../../messages/index.js';
import { GetPageAnalysis } from '../../page-analysis/index.js';
import { AnalyzePage } from '../../pages/index.js';
import { CancelCoversationTaskGroups, CreateTaskGroup, ListCoversationTaskGroups, PauseCoversationTaskGroups, ResumeCoversationTaskGroups } from '../../task-groups/index.js';
import { CreateTask } from '../../tasks/create/index.js';
import { OpenaiSendText } from '../../openai/index.js';
import { StartTask } from '../../tasks/start/index.js';
import { CreateConversation } from '../create/index.js';
import { UpdateConversation } from '../update/index.js';
import { Def, serviceName } from './def.js';
// import { SpeakerVerifier } from '../../functions/speaker-verify.js';
import { SpeakerVerifier } from '../../functions/speaker-verify-2.js';
import { AudioStreamAccumulator } from '../../functions/audio-accumulator.js';
import { appendPcmToWav } from '../../functions/save-audio.js';
import { removeSilence } from '../../functions/remove-silence.js';
import { STT_MODE } from '../../config.js';

const endedNotRecivedTimeoutByConvUid: {[key: string]: any} = {}
const sttConvUid: {[key: string]: {
        stt: Awaited<ReturnType<typeof streamAudioToOpenAI>>,
        params: Def["Params"],
        verifier: SpeakerVerifier,
        accumulator: AudioStreamAccumulator,
        bufferForRef: Buffer[]
}} = {}

let reqSeq = 0;
const generateReqId = (convUid: string) => `${convUid}-${++reqSeq}`

let loadedPages: {
    [key: string]: {
            analysis?: PageAnalysisM
            analysisDef?: Deferred<PageAnalysisM>
            analysisLock?: boolean;
            analysisNotFoundSince?: string
    }
} = {}

export const createService = (
    context: {
        getUserId: Context.GetUserId
        generateBookStructure: Context.generateBookStructure
        sendToClient: Context.sendToClient
    },
    depends: {
        tajData: {
            getLinkedItems: Service<GetLinkedItems>;
            getLinks: Service<GetLinks>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        createConversation: Service<CreateConversation>;
        updateConversation: Service<UpdateConversation>;
        // createMessage: Service<CreateMessage>;
        createTask: Service<CreateTask>;
        startTask: Service<StartTask>;
        openaiSendText: Service<OpenaiSendText>;
        getBook: Service<GetBook>;
        getPageAnalysis: Service<GetPageAnalysis>;
        analyzePage: Service<AnalyzePage>;
        cancelCoversationTaskGroups: Service<CancelCoversationTaskGroups>;
        listCoversationTaskGroups: Service<ListCoversationTaskGroups>;
        pauseCoversationTaskGroups: Service<PauseCoversationTaskGroups>;
        resumeCoversationTaskGroups: Service<ResumeCoversationTaskGroups>;
        createTaskGroup: Service<CreateTaskGroup>;
    },
) =>
    createBaseService<Def>(serviceName, ['conversationUid'], async (params, scope, errorout, warn) => {

        await depends.updateConversation({
            uid: params.conversationUid,
            language: params.language,
        }, scope)
        
        const bookUid = params.bookUid
        const pageIndex = params.pageIndex
        const stepUid = params.stepId

        const pageUid = pageIndex ? `${bookUid}/${pageIndex}` : undefined

        if(bookUid && pageIndex === undefined) {
                throw new Error("Missing pageIndex")
        }


        if (params.event === 'audio') {
                
                if(!sttConvUid[params.conversationUid]) {
                        const stt = await streamAudioToOpenAI({
                                onMessage: async (msg) => {

                                        const audioObj = sttConvUid[params.conversationUid]
                                        const ps = audioObj.params

                                        if (!hasLettersOrNumbers(msg.data.content)) {
                                                console.log(`Empty STT message: ${msg.data.content}`)
                                                return
                                        }
                                        
                                        const refDur = verifier.getReferenceDurationMs("personA")
                                        console.log(`New STT message: ${msg.data.content}, Speaker ref duration (ms): ${refDur}`)
                                        if(!audioObj.verifier.isRefReady("personA")) {
                                                for(const buffer of audioObj.bufferForRef) {
                                                        console.log(`Adding speaker ref..`)
                                                        await appendPcmToWav(`./tmp/ref-${ps.recordingId}.wav`, buffer)
                                                        await verifier.addRefBuffer(
                                                                'personA',
                                                                buffer,
                                                        );
                                                }
                                        }
                                        audioObj.bufferForRef = []

                                        const taskGroups = (await depends.listCoversationTaskGroups({conversationUid: ps.conversationUid, query: {sort: 'DESC'}}, scope)).data.items
                                        const lastCompletedI = taskGroups.findIndex((tg, i) => tg.status == "completed")
                                        const pendingGroups = taskGroups.find((tg, i) => {
                                                const SECONDS = 4_000;

                                                const createdTime = tg.createdAt ? new Date(tg.createdAt).getTime() : null;
                                                const isItOld = createdTime !== null && Date.now() - createdTime > 30_000;// to prevent loading inturpted task group that kept running status

                                                const completedTime = tg.completedAt ? new Date(tg.completedAt).getTime() : null;
                                                const isCompletedRecent = completedTime !== null && Date.now() - completedTime <= SECONDS;

                                                return ((tg.status == "running" && !isItOld) || isCompletedRecent) && i <= lastCompletedI
                                        })
                                        // const sortedPendingGroups = pendingGroups.sort((a, b) => a.createdAt! < b.createdAt! ? -1 : 1)
                                        // const textStepsTasks = sortedPendingGroups.map(tg => tg.tasks).flat().filter(t => t.type == "text-steps")
                                        // const prevText = textStepsTasks.map(t => (t.input as TextStepsInput).userText ?? '').join(" ")
                                        const prevTaskInput = pendingGroups?.tasks.find(t => t.type == "text-steps")?.input as TextStepsInput
                                        
                                        
                                        await depends.cancelCoversationTaskGroups({ conversationUid: ps.conversationUid }, scope)
                                        
                                        console.log(`carrying prev text: ${prevTaskInput?.userText}, ${lastCompletedI}`)

                                        const taskGroupUid = (await depends.createTaskGroup({
                                                conversationUid: ps.conversationUid,
                                                clientRequestId: ps.requestId,
                                        }, scope)).data.uid


                                        await context.sendToClient(scope, {
                                                event: "ai-agent-status",
                                                status: 'thinking',
                                        });
                
                                        // textStream.write(`stt-output`, msg.data.content)
                
                                        let instructions = undefined
                                        // if (ps.language == "ar")
                                        //         instructions = `عندما يكون المطلوب شرح استخدم boardContent لكتابة ورسم محتوى منسق بشكل جميل`
                                        // else
                                        //         instructions = `When it is requirment to explain, use boardContent to visualize with rich html/svg content`
                
                                        // if(currentStepId) {
                                        //         instructions += `\n current user stepId: ${currentStepId}`
                                        // }
                                        // textStream.send(instructions)

                                        // await depends.createMessage({
                                        //         conversationUid: params.conversationUid,
                                        //         bookUid,
                                        //         pageIndex,
                                        //         stepUid,
                                        //         userReqType: 'audio',
                                        //         userText: msg.data.content,
                                        //         instructions,
                                        // }, scope)
                                        const input: TextStepsInput = {
                                                bookUid: ps.bookUid,
                                                pageIndex: ps.pageIndex,
                                                stepUid: ps.stepId,
                                                userReqType: 'audio',
                                                userText: (prevTaskInput?.userText ?? '') + ' ' + msg.data.content,
                                                instructions,
                                        }
                                        const taskRes = (await depends.createTask({
                                                taskGroupUid,
                                                type: 'text-steps',
                                                input,
                                        }, scope)).data
                                        await depends.startTask({
                                                taskUid: taskRes.uid
                                        }, scope)
                                },
                                onDelta: (delta) => {
                                        
                                }
                        })

                        // const verifier = new SpeakerVerifier(
                        //         './models/speaker_encoder_fp32.onnx',
                        //         {  
                        //                 windowFrames: 0, // whole utterance; remove this line if the model rejects it
                        //         }
                        // );

                        const verifier = new SpeakerVerifier(
                                './models/wespeaker_en_voxceleb_resnet34_LM.onnx',
                        );
                              
                        await verifier.init();
                              
                        const accumulator = new AudioStreamAccumulator(
                                24_000, // sample rate
                                2,      // 16-bit = 2 bytes
                                1,      // mono
                                2000,   // accumulate 2000ms
                        )
                        accumulator.onData(async (b) => {

                                const buffer = removeSilence(b, {});
                                
                                if(!buffer) {
                                        return
                                }

                                else if(STT_MODE == 'separate') {
                                        await stt.write(buffer)
                                }

                                try {
                                        audioObj.bufferForRef.push(buffer)
                                                
                                                // //You should record perhaps 20–50 samples
                                                // await verifier.addRefBuffer(
                                                //         'personA',
                                                //         buffer,
                                                // );
                                        
                                        const refDur = verifier.getReferenceDurationMs("personA")
                                        console.log(`Speaker ref duration (ms): ${refDur}`)
                                        await appendPcmToWav(`./tmp/input-${params.recordingId}.wav`, buffer)
                                        if(audioObj.verifier.isRefReady("personA")) {
                                                const res = await verifier.verify(buffer)
                                                console.log(`Audio Verification: ${JSON.stringify(res)}`)
                                                if(res.score > 0.8) {
                                                        
                                                        context.sendToClient(scope,{
                                                                event: "ai-agent-status",
                                                                status: 'paused',
                                                        } );
                                                }
                                        }
                                }
                                catch(err: any) {
                                        console.error(`Cannot add SpeakerVerifier.ref. Error: ${err.message}. Stack: ${err.stack}`)
                                }
                        });
                        accumulator.onEnd(async () => {
                                
                                if(STT_MODE == "separate") {
                                        stt.end()
                                }

                                else if(STT_MODE == 'gemini') {

                                        let instructions = undefined
                                        // if (params.language == "ar")
                                        //         instructions = `عندما يكون المطلوب شرح استخدم boardContent لكتابة ورسم محتوى منسق بشكل جميل`
                                        // else
                                        //         instructions = `When it is requirment to explain, use boardContent to visualize with rich html/svg content`

                                        await depends.cancelCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)

                                        const taskGroupUid = (await depends.createTaskGroup({
                                                conversationUid: params.conversationUid,
                                                clientRequestId: params.requestId,
                                        }, scope)).data.uid


                                        await context.sendToClient(scope, {
                                                event: "ai-agent-status",
                                                status: 'thinking',
                                        });


                                        const input: TextStepsInput = {
                                                bookUid: params.bookUid,
                                                pageIndex: params.pageIndex,
                                                stepUid: params.stepId,
                                                userReqType: 'audio',
                                                userText: "",
                                                userAudioChunks: audioObj.bufferForRef.map(buf => buf.toString('base64')),
                                                instructions,
                                        }
                                        const taskRes = (await depends.createTask({
                                                taskGroupUid,
                                                type: 'text-steps',
                                                input,
                                        }, scope)).data
                                        await depends.startTask({
                                                taskUid: taskRes.uid
                                        }, scope)
                                }
                        })
                        sttConvUid[params.conversationUid] = {
                                stt,
                                verifier,
                                accumulator,
                                params,
                                bufferForRef: [],
                        }
                }

                const stt = sttConvUid[params.conversationUid].stt;
                const verifier = sttConvUid[params.conversationUid].verifier;
                const accumulator = sttConvUid[params.conversationUid].accumulator;
                const audioObj = sttConvUid[params.conversationUid];


                if (params.preroll) {
                        // await depends.pauseCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)

                        sttConvUid[params.conversationUid].params = params
                        audioObj.bufferForRef = []
                }

                // await stt.write(params.data!)
                accumulator.write(Buffer.from(
                        params.data!,
                        'base64'
                      )
                )


                console.log(`avgIsSpeech: ${params.avgIsSpeech}, loudnessDbfs: ${params.loudnessDbfs}`)
                const end = () => {
                        // if (endedNotRecivedTimeoutByConvUid[params.conversationUid]) {
                        //         clearTimeout(endedNotRecivedTimeoutByConvUid[params.conversationUid])
                        //         endedNotRecivedTimeoutByConvUid[params.conversationUid] = undefined
                        // }
                        // stt.end()

                        console.log(`[onEnd] called, ${params.ended}`)
                        accumulator.end()
                }

                clearTimeout(endedNotRecivedTimeoutByConvUid[params.conversationUid])
                if (params.ended) {
                        // I would not run verify() independently on every tiny buffer. Accumulate around 2–3 seconds of speech, verify that window, and then use overlapping windows if you need continuous detection.
                        end()
                }
                else {
                        endedNotRecivedTimeoutByConvUid[params.conversationUid] = setTimeout(() => {
                                console.log(`voiced ending timeout defined`)
                                end()
                        }, 2000)
                }
        }
        // if(packet.event === "audio-ended") {
        //     chirp.end()
        // }
        if (params.event === "json") {
                const data = params.data ? JSON.parse(params.data) : {}

                if (data.text) {
                        await depends.cancelCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)

                        let instructions = undefined
                        if (params.language == "ar")
                          instructions = `عندما يكون المطلوب شرح استخدم boardContent لكتابة ورسم محتوى منسق بشكل جميل`
                        else
                          instructions = `When it is requirment to explain, use boardContent to visualize with rich html/svg content`

                        if(stepUid) {
                                instructions += `\n current user stepId: ${stepUid}`
                        }
                        // textStream.write('user-text', data.text, true)
                        // textStream.send(instructions)
                        // await depends.createMessage({
                        //     conversationUid: params.conversationUid,
                        //     bookUid,
                        //     pageIndex,
                        //     stepUid,
                        //     userText: data.text,
                        //     instructions,
                        // }, scope)


                        const taskGroupUid = (await depends.createTaskGroup({
                                conversationUid: params.conversationUid,
                                clientRequestId: params.requestId,
                        }, scope)).data.uid
                        
                        const input: TextStepsInput = {
                                bookUid,
                                pageIndex,
                                stepUid,
                                userText: data.text,
                                instructions,
                        }
                        const taskRes = (await depends.createTask({
                                taskGroupUid,
                            type: 'text-steps',
                            input,
                        }, scope)).data
                        
                        await depends.startTask({
                            taskUid: taskRes.uid
                        }, scope)

                        context.sendToClient(scope,{
                            event: "ai-agent-status",
                            status: 'thinking',
                    } );
                }
                else if (data.action == "clarify-part") {
                        await depends.cancelCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)

                        const analysis = pageUid ? (await depends.getPageAnalysis({
                                uid: pageUid
                            }, {
                                ...scope,
                                cache: {
                                    key: `page-analysis-${pageUid}`,
                                    ttl: 1000 * 60 * 5,
                                },
                            }))?.data.item : undefined

                        const part = analysis?.parts?.find((p: any) => p.id == data.partId)
                        if (part) {
                                let content = part.content
                                let parentContent: string | undefined = undefined
                                let userReqType: MessageE["data"]["userReqType"] | undefined = undefined
                                let userText: string | undefined = undefined
                                if (part.type?.includes("concept")) {
                                        userReqType = 'clarify-concept'
                                        if (params.language == "ar")
                                                userText = `اشرح هذا المفهوم بالتفصيل مع الأمثلة واستخدم boardContent لكتابة ورسم محتوى منسق بشكل جميل`
                                        else
                                                userText = `explain this concept with more details and examples and use boardContent to visualize with rich html/svg content`
                                }
                                else if (part.type?.includes("example")) {
                                        userReqType = 'clarify-concept'
                                        if (params.language == "ar")
                                                userText = `اشرح هذا المثال بالتفصيل واستخدم واستخدم boardContent لكتابة ورسم محتوى منسق بشكل جميل`
                                        else
                                                userText = `explain this example with more details and use boardContent to visualize with rich html/svg content`
                                }
                                else {
                                        const parentPart = part.type.includes("question") && part?.parentId ? analysis?.parts?.find((p: any) => p.id == part.parentId)! : undefined
                                        parentContent = parentPart?.content
                                        userReqType = 'clarify-question'
                                        if (params.language == "ar")
                                                userText = `اقرأ السؤل ثم اشرح هذا السؤال بدون ذكر الاجابة واستخدم boardContent لكتابة ورسم محتوى منسق بشكل جميل ثم اكتب ٣ خيارات باستخدام تاق`
                                        else
                                                userText = `read this question then explain without mentioning the answer and use boardContent to visualize with rich html/svg content, then write 3 options and use tag option`
                                }
                                // textStream.send(`Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentContent}}`)

                                // await depends.createMessage({
                                //     conversationUid: params.conversationUid,
                                //     bookUid,
                                //     pageIndex,
                                //     stepUid,
                                //     userReqType,
                                //     userText,
                                //     instructions: `Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentContent}}`,
                                // }, scope)

                                const taskGroupUid = (await depends.createTaskGroup({
                                        conversationUid: params.conversationUid,
                                        clientRequestId: params.requestId,
                                }, scope)).data.uid

                                const input: TextStepsInput = {
                                        bookUid,
                                        pageIndex,
                                        stepUid,
                                        userReqType,
                                        userText,
                                        instructions: `Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentContent}}`,
                                }
                                const taskRes = (await depends.createTask({
                                taskGroupUid,
                                    type: 'text-steps',
                                    input,
                                }, scope)).data
                                await depends.startTask({
                                    taskUid: taskRes.uid
                                }, scope)
                                

                                context.sendToClient(scope, {
                                    event: "ai-agent-status",
                                    status: 'thinking',
                            });
                        }
                        else {
                                throw new Error(`part ID ${data.partId} not exist`)
                        }
                }
                else if (data.action == "solve") {
                        await depends.cancelCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)

                        const analysis = pageUid ? (await depends.getPageAnalysis({
                                uid: pageUid
                            }, {
                                ...scope,
                                cache: {
                                    key: `page-analysis-${pageUid}`,
                                    ttl: 1000 * 60 * 5,
                                },
                            }))?.data.item : undefined

                        const part = analysis?.parts?.find((p: any) => p.id == data.partId)
                        if (part) {
                                const parentPart = part.type.includes("question") && part?.parentId ? analysis?.parts?.find((p: any) => p.id == part.parentId)! : undefined
                                // const content = (parentPart?.type.includes("question_group") ? `${parentPart.content}\n` : '') + part.content

                                let userText: string | undefined = undefined

                                if (params.language == "ar")
                                        userText = `اقرأ السؤل ثم اشرح وحل هذا السؤال واستخدم tool writeToBoard لكتابة ورسم محتوى منسق بشكل جميل ثم اكتب ٣ خيارات باستخدام تاق`
                                else
                                        userText = `read this question then explain and solve and use tool writeToBoard to visualize with rich html/svg content, then write 3 options and use tag option`

                                // textStream.send(`Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentPart?.content}}`)

                                // await depends.createMessage({
                                //     conversationUid: params.conversationUid,
                                //     bookUid,
                                //     pageIndex,
                                //     stepUid,
                                //     userReqType: 'clarify-question',
                                //     userText,
                                //     instructions: `Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentPart?.content}}`,
                                // }, scope)

                                const taskGroupUid = (await depends.createTaskGroup({
                                        conversationUid: params.conversationUid,
                                        clientRequestId: params.requestId,
                                }, scope)).data.uid
                                
                                const input: TextStepsInput = {
                                        bookUid,
                                        pageIndex,
                                        stepUid,
                                        userReqType: 'clarify-question',
                                        userText,
                                        instructions: `Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentPart?.content}}`,
                                }
                                const taskRes = (await depends.createTask({
                                        taskGroupUid,
                                    type: 'text-steps',
                                    input
                                }, scope)).data
                                await depends.startTask({
                                    taskUid: taskRes.uid
                                }, scope)

                                context.sendToClient(scope, {
                                    event: "ai-agent-status",
                                    status: 'thinking',
                            });
                        }
                        else {
                                throw new Error(`part ID ${data.partId} not exist`)
                        }
                }
                else if (data.action == "show-options") {
                        await depends.cancelCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)

                        const analysis = pageUid ? (await depends.getPageAnalysis({
                                uid: pageUid
                            }, {
                                ...scope,
                                cache: {
                                    key: `page-analysis-${pageUid}`,
                                    ttl: 1000 * 60 * 5,
                                },
                            }))?.data.item : undefined
                        const part = analysis?.parts?.find((p: any) => p.id == data.partId)
                        if (part) {
                                const parentPart = part.type.includes("question") && part?.parentId ? analysis?.parts?.find((p: any) => p.id == part.parentId)! : undefined
                                // const content = parentPart?.type.includes("question_group") ? `${parentPart.content}\n` : part.content

                                // if (packet.language == "ar")
                                //         textStream.write(`user-clarify-question`, `.اكتب 3 إجابات محتملة للسؤال`, true)
                                // else
                                //         textStream.write(`user-clarify-question`, ``, true)

                                // textStream.send(`Write 3 possible answers to the question: exactly one correct answer and 2 plausible but wrong answers based on common student mistakes or misconceptions. Keep all options similar in length, style, and wording so the correct one doesn't stand out, avoid options like "all of the above" or "none of the above", and place the correct answer in a random position. \nDon't write anything else: no introduction, explanation, comments, numbering, or indication of which answer is correct. Only the three options, each on its own line. Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentPart?.content}}`, 'options')

//                                 await depends.createMessage({
//                                     conversationUid: params.conversationUid,
//                                     bookUid,
//                                     pageIndex,
//                                     stepUid,
//                                     userReqType: 'options',
//                                     instructions: `Write 3 possible answers to the question: exactly one correct answer and 2 plausible but wrong answers based on common student mistakes or misconceptions. Keep all options similar in length, style, and wording so the correct one doesn't stand out, avoid options like "all of the above" or "none of the above", and place the correct answer in a random position.
// Don't write anything else: no introduction, explanation, comments, numbering, or indication of which answer is correct. Only the three options, each on its own line. Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentPart?.content}}`,
//                                 }, scope)

                                const taskGroupUid = (await depends.createTaskGroup({
                                        conversationUid: params.conversationUid,
                                        clientRequestId: params.requestId,
                                }, scope)).data.uid

                                const input: TextStepsInput = {
                                    bookUid,
                                    pageIndex,
                                    stepUid,
                                    userReqType: 'options',
                                    instructions: `Write 3 possible answers to the question: exactly one correct answer and 2 plausible but wrong answers based on common student mistakes or misconceptions. Keep all options similar in length, style, and wording so the correct one doesn't stand out, avoid options like "all of the above" or "none of the above", and place the correct answer in a random position.
Don't write anything else: no introduction, explanation, comments, numbering, or indication of which answer is correct. Only the three options, each on its own line. Current page part meta data: {partId: ${data.partId}, content: ${part.content}, parentContent: ${parentPart?.content}}`,
                                        mode: 'options',
                                }

                                const taskRes = (await depends.createTask({
                                        taskGroupUid,
                                    type: 'text-steps',
                                    input,
                                }, scope)).data
                                await depends.startTask({
                                    taskUid: taskRes.uid
                                }, scope)
                                
                                context.sendToClient(scope, {
                                    event: "ai-agent-status",
                                    status: 'thinking',
                            });
                        }
                        else {
                                throw new Error(`Do not write any step, just write 3 options .part ID ${data.partId} not exist`)
                        }
                }
                else {
                        throw new Error(`Unkown mesg: ${JSON.stringify(params)}`)
                }
        }
        else if(params.event == "cancel") {
                await depends.cancelCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)
        }
        else if(params.event == "pause") {
                await depends.pauseCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)
        }
        else if(params.event == "resume") {
                await depends.resumeCoversationTaskGroups({ conversationUid: params.conversationUid }, scope)
        }

        return {
            success: true
        }
    });
