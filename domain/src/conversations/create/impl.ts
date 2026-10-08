import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Context } from '../../context.js';
import { BookLinkKeys } from '../../entities/Book.js';
import { ConversationE } from '../../entities/Conversation.js';
import { Def, serviceName } from './def.js';

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
    createBaseService<Def>(serviceName, ['language'], async (params, scope, errorout, warn) => {

        const userId = await context.getUserId(scope)

        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }
        
        const data: ConversationE['data'] = {
            language: params.language,
        };

        const {pk, uid} = UID_SCHEMA.conversations.generate()

        await depends.tajData.createItem(
            {
                pk,
                data,
            },
            scope,
        );

        await depends.tajData.link({
            aPK: {
                cid: DATA_SCHEMA.collections.users,
                id: userId!,
            },
            bPK: pk,
            linkId: DATA_SCHEMA.links.user_conversation,
            aKey: BookLinkKeys.user,
        }, scope)
        
        return {
            uid,
        };
    });
