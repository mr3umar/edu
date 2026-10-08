import { GetItems, GetLinkedItems, Lock } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE, BookM, mapBook } from '../../entities/index.js';
import { Context } from '../../context.js';
import { mapMessage, MessageE } from '../../entities/Message.js';
import { GetPageAnalysis } from '../../page-analysis/index.js';
import { GetBook } from '../../books/index.js';
import { isServiceError } from '../../types.js';
import { AnalyzePage } from '../../pages/index.js';
import { ListCoversationTaskGroups } from '../../task-groups/index.js';
import { TextStepsInput, TextStepsOutput } from '../../entities/Task.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
        getPageImageBase64: Context.getPageImageBase64
        sendToClient: Context.sendToClient

    },
    depends: {
        tajData: {
            getItems: Service<GetItems>;
            getLinkedItems: Service<GetLinkedItems>;
            lock: Service<Lock>;
        };
        getBook: Service<GetBook>;
        getPageAnalysis: Service<GetPageAnalysis>;
        analyzePage: Service<AnalyzePage>;
        listCoversationTaskGroups: Service<ListCoversationTaskGroups>;
    },
) =>
    createBaseService<Def>(serviceName, ["conversationUid"], async (params, scope, errorout, warn) => {

        const messages: Def["Data"]["messages"] = []

        const taskGroups = (await depends.listCoversationTaskGroups({
            conversationUid: params.conversationUid,
            query: {
                sort: "ASC"
            }
        }, scope)).data.items

        let loadedPages: string[] = []

        const books: BookM[] = []

        for (const tg of taskGroups) {

            for (const t of tg.tasks) {
                if (t.type == "text-steps") {
                    const input = t.input as TextStepsInput
                    const output = t.output as TextStepsOutput

                    if (input.bookUid && !books.find(b => b.uid == input.bookUid)) {
                        try {
                            const book = (await depends.getBook({
                                uid: input.bookUid
                            }, scope)).data.item;
                            books.push(book)
                        }
                        catch (err: any) {
                            console.warn(`cannot load book ${input.bookUid}. Error: ${err.message}`)
                        }
                    }
                    const book = input.bookUid ? books.find(b => b.uid == input.bookUid) : undefined

                    if (input.pageIndex) {
                        if (input.bookUid) {
                            const pageUid = `${input.bookUid}/${input.pageIndex}`
                            if (!loadedPages.includes(pageUid)) {

                                const base64 = await context.getPageImageBase64(scope, input.bookUid, input.pageIndex)
                                const dataUrl = `data:image/png;base64,${base64}`;
                                console.log(`Loading image to ai ${input.pageIndex}`)
                                messages.push({
                                    uid: t.uid,
                                    type: "page-image",
                                    content: dataUrl
                                })
                                loadedPages.push(pageUid)

                                try {
                                    const analysis = (await depends.getPageAnalysis({
                                        uid: pageUid
                                    }, scope))?.data.item

                                    if (!analysis) {
                                        throw new Error("page analysis not found")
                                    }
                                    delete (analysis as any).words
                                    for (const part of analysis.parts) {
                                        if (part.transformedText)
                                            part.content = part.transformedText.short

                                        delete part.transformedText
                                    }
                                    const pageContent = {
                                        language: book?.language,
                                        page: analysis,
                                        // relatedPages, 
                                        // section: {
                                        //     ...section, tutorials: [{id: '001', steps: tutorial1.steps}]
                                        // } 
                                    }
                                    messages.push({
                                        uid: t.uid,
                                        type: "page-analysis",
                                        content: `Current Page analysis you can use it with page image for more accuracy, you can mention to user meta data in this page analysis except [word]...[/word],${JSON.stringify(pageContent)}`
                                    })
                                }
                                catch (err: any) {
                                    if (isServiceError<GetPageAnalysis>(err) && err.result.error?.code == "NotFound") {

                                        const lockRes = await depends.tajData.lock({
                                            key: `page-analysis-${pageUid}`,
                                            TTL: 60 * 10,
                                            data: {}
                                        }, scope)

                                        if (lockRes.data.succeed) {
                                            void depends.analyzePage({ uid: pageUid }, scope)
                                                .then(res => {
                                                    context.sendToClient(scope, {
                                                        event: "ai-task",
                                                        task: 'page-analysis',
                                                        pageIndex: input.pageIndex,
                                                        status: 'completed'
                                                    })
                                                })
                                                .catch(err => {

                                                    context.sendToClient(scope, {
                                                        event: "ai-task",
                                                        task: 'page-analysis',
                                                        pageIndex: input.pageIndex,
                                                        status: 'failed'
                                                    })
                                                    console.error(`Cannot analyze page ${pageUid}. Error: ${err.message}`)
                                                })

                                            await context.sendToClient(scope, {
                                                event: "ai-task",
                                                task: 'page-analysis',
                                                pageIndex: input.pageIndex,
                                                status: 'started'
                                            })
                                            console.log(`page-analysis ${pageUid}..`)
                                        }
                                    }
                                    else
                                        console.warn(`cannot load page analysis ${pageUid}. Error: ${err.message}`)
                                }
                            }
                        }
                        else {
                            console.warn(`Missing bookUid in conversation item while pageIndex was defined.`)
                        }
                        
                    }
                    if (input.stepUid && t.status != "canceled") {
                        messages.push({
                            uid: `${t.uid}-instructions`,
                            type: "instructions",
                            content: `current user stepId: ${input.stepUid}`,
                        })
                    }

                    if (input.instructions && t.status != "canceled") {
                        messages.push({
                            uid: `${t.uid}-instructions`,
                            type: "instructions",
                            content: input.instructions,
                        })
                    }

                    if (input.userText && t.status != "canceled") {
                        messages.push({
                            uid: `${t.uid}-user`,
                            type: "user-text",
                            content: input.userText,
                        })
                    }

                    if (input.userAudioChunks && t.status != "canceled") {
                        input.userAudioChunks.map((ch, i) => {
                            
                            // const dataUrl = `data:audio/wav;base64,${ch}`;
                            messages.push({
                                uid: `${t.uid}-user-audio-chunk-${i}`,
                                type: "user-audio",
                                content: ch,
                            })
                        })
                    }

                    if(output && t.status != "canceled") {
                        messages.push({
                            uid: `${t.uid}-assistant`,
                            type: "assistant",
                            content: JSON.stringify(output),
                        })
                    }

                }
            }
        }


        return {
            messages,
        };
    });
