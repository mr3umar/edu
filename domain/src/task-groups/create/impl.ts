import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Context } from '../../context.js';
import { TaskE } from '../../entities/Task.js';
import { Def, serviceName } from './def.js';
import { TaskGroupE, TaskGroupLinkKeys } from '../../entities/TaskGroup.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['conversationUid',], async (params, scope, errorout, warn) => {

        const data: TaskGroupE['data'] = {
            clientRequestId: params.clientRequestId,
            status: 'running'
        };

        const {pk} = UID_SCHEMA.taskGroups.generate()

        await depends.tajData.createItem(
            {
                pk,
                data,
            },
            scope,
        );
        
        await depends.tajData.link({
            aPK: pk,
            bPK: UID_SCHEMA.conversations.parse(params.conversationUid),
            linkId: DATA_SCHEMA.links.taskGroup_conversation,
            bKey: TaskGroupLinkKeys.conversation,
        }, scope)

        return {
            uid: UID_SCHEMA.taskGroups.toUid(pk),
        };
    });
