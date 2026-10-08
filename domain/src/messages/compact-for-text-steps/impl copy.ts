import { GetItems, GetLinkedItems, Lock } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import {  DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE, BookM, mapBook } from '../../entities/index.js';
import { Context } from '../../context.js';
import { mapMessage, MessageE } from '../../entities/Message.js';
import { GetPageAnalysis } from '../../page-analysis/index.js';
import { GetBook } from '../../books/index.js';
import { isServiceError } from '../../types.js';
import { AnalyzePage } from '../../pages/index.js';

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
    },
) =>
    createBaseService<Def>(serviceName, ["conversationUid"], async (params, scope, errorout, warn) => {
        
            
                
                const items = (await depends.tajData.getItems(
                    {
                        fromPK: {
                            cid: DATA_SCHEMA.collections.messages,
                            pid: params.conversationUid,
                        },
                        sort: 'ASC', 
                    },
                    scope,
                )).data.items as MessageE[];


            const convItems = items.map(mapMessage)

            const messages: Def["Data"]["messages"] = []

            let loadedPages: string[] = []

            const books: BookM[] = []

            for(const item of convItems) {
                if(item.bookUid && !books.find(b => b.uid == item.bookUid)) {
                    try {
                        const book = (await depends.getBook({
                            uid: item.bookUid
                        }, scope)).data.item;
                        books.push(book)
                    }
                    catch(err: any) {
                        console.warn(`cannot load book ${item.bookUid}. Error: ${err.message}`)
                    }
                }
                const book = item.bookUid ? books.find(b => b.uid == item.bookUid) : undefined
                
                if(item.pageIndex) {
                    if(item.bookUid) {
                        const pageUid = `${item.bookUid}/${item.pageIndex}`
                        if(!loadedPages.includes(pageUid)) {

                            const base64 = await context.getPageImageBase64(scope, item.bookUid, item.pageIndex)
                            const dataUrl = `data:image/png;base64,${base64}`;
                            console.log(`Loading image to ai ${item.pageIndex}`)
                            messages.push({
                                uid: item.uid,
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
                                for(const part of analysis.parts) {
                                        if(part.transformedText)
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
                                    uid: item.uid,
                                    type: "page-analysis",
                                    content: `Current Page analysis you can use it with page image for more accuracy, you can mention to user meta data in this page analysis except [word]...[/word],${JSON.stringify(pageContent)}`
                                })

                            }
                            catch(err: any) {
                                if(isServiceError<GetPageAnalysis>(err) && err.result.error?.code == "NotFound") {

                                    const lockRes = await depends.tajData.lock({
                                        key: `page-analysis-${pageUid}`,
                                        TTL: 60 * 10,
                                        data: {}
                                    }, scope)

                                    if(lockRes.data.succeed) {
                                        void depends.analyzePage({uid: pageUid}, scope)
                                        .then(res => {
                                                context.sendToClient(scope, {
                                                    event: "ai-task",
                                                    task: 'page-analysis',
                                                    pageIndex: item.pageIndex,
                                                    status: 'completed'
                                            })
                                        })
                                        .catch(err => {
        
                                                context.sendToClient(scope, {
                                                    event: "ai-task",
                                                    task: 'page-analysis',
                                                    pageIndex: item.pageIndex,
                                                    status: 'failed'
                                            })
                                                console.error(`Cannot analyze page ${pageUid}. Error: ${err.message}`)
                                        })
        
                                        await context.sendToClient(scope, {
                                            event: "ai-task",
                                            task: 'page-analysis',
                                            pageIndex: item.pageIndex,
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
                if(item.stepUid) {
                    messages.push({
                        uid: item.uid,
                        type: "instructions",
                        content: `current user stepId: ${item.stepUid}`,
                    })
                }

                if(item.instructions) {
                    messages.push({
                        uid: item.uid,
                        type: "instructions",
                        content: item.instructions,
                    })
                }

                if(item.userText) {
                    messages.push({
                        uid: item.uid,
                        type: "user-text",
                        content: item.userText,
                    })
                }
            }

        
            return {
                messages,
            };
    });
