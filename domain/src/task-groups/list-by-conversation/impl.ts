import { GetItems, GetLinkedItems, notEmpty } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import {  DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE, mapBook } from '../../entities/index.js';
import { Context } from '../../context.js';
import { mapTaskGroup, TaskGroupE } from '../../entities/TaskGroup.js';
import { mapConversation } from '../../entities/Conversation.js';

export const createService = (
    context: {
            getUserId: Context.GetUserId
        },
    depends: {
        tajData: {
            getItems: Service<GetItems>;
            getLinkedItems: Service<GetLinkedItems>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["conversationUid"], async (params, scope, errorout, warn) => {
        

                const linksRes = await depends.tajData.getLinkedItems({
                    pk: UID_SCHEMA.conversations.parse(params.conversationUid),
                    linkId: DATA_SCHEMA.links.taskGroup_conversation,
                    point: 'b',
                    sort: params.query?.sort
                }, scope)
        
                const items = linksRes.data.links.map(l => l.item as unknown as TaskGroupE).filter(notEmpty)
        
                return {
                    items: items.map(mapTaskGroup),
                    next: linksRes.data.nextKey
                };
    });
