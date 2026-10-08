import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Context } from '../../context.js';
import { BookE, BookLinkKeys } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { MessageE } from '../../entities/Message.js';

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

        const userId = await context.getUserId(scope)

        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }
        
        const data: MessageE['data'] = {
            bookUid: params.bookUid,
            pageIndex: params.pageIndex,
            stepUid: params.stepUid,
        };

        const id = UID_SCHEMA.messages.generate().id
        const pk = {
            cid: DATA_SCHEMA.collections.messages,
            pid: params.conversationUid,
            id,
        }

        await depends.tajData.createItem(
            {
                pk,
                data,
            },
            scope,
        );
        
        return {
            uid: UID_SCHEMA.messages.toUid(pk),
        };
    });
