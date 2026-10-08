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
import { TextStepsInput, TextStepsOutput, UploadedImageInput } from '../../entities/Task.js';

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

        for (const tg of taskGroups) {

            for (const t of tg.tasks) {
                if (t.type == "text-steps") {
                    const input = t.input as TextStepsInput
                    const output = t.output as TextStepsOutput

                    if (input.userText && t.status != "canceled") {
                        messages.push({
                            uid: `${t.uid}-user`,
                            type: "user-text",
                            userText: input.userText,
                        })
                    }

                    if(output && t.status != "canceled") {
                        messages.push({
                            uid: `${t.uid}-assistant`,
                            type: "assistant",
                            assistant: output,
                        })
                    }

                }

                if(t.type == "uploaded-image") {
                    messages.push({
                        uid: `${t.uid}-assistant`,
                        type: "user-uploaded-image",
                        uploadUid: (t.input as UploadedImageInput).uploadUid,
                    })
                }
            }
        }


        return {
            messages,
        };
    });
