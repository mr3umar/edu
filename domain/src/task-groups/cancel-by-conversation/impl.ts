import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { GetItems, GetLinkedItems } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { CancelTaskGroup } from '../cancel/index.js';
import { Def, serviceName } from './def.js';
import { ListCoversationTaskGroups } from '../list-by-conversation/index.js';

export const createService = (
    context: {
            getUserId: Context.GetUserId
        },
    depends: {
        tajData: {
            getItems: Service<GetItems>;
            getLinkedItems: Service<GetLinkedItems>;
        };
        listCoversationTaskGroups: Service<ListCoversationTaskGroups>;
        cancelTaskGroup: Service<CancelTaskGroup>;
    },
) =>
    createBaseService<Def>(serviceName, ["conversationUid"], async (params, scope, errorout, warn) => {
        console.log(`## Canceling by conver ${params.conversationUid}`)

        const lastTGs = await (await depends.listCoversationTaskGroups({
            conversationUid: params.conversationUid,
            query: {
                    sort: "DESC"
            }
        }, scope)).data.items
        
        await Promise.all(lastTGs.map(async tg => {
            if(tg.status != "canceled" && tg.status != "completed") {
                await depends.cancelTaskGroup({
                        uid: tg.uid,
                }, scope)
            }
        }))

        return {
            succeed: true
        };
    });
