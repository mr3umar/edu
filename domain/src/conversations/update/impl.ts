import { CreateItem, DeleteItem, GetItem, Link, UpdateItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE } from '../../entities/Book.js';
import { ConversationE } from '../../entities/Conversation.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            updateItem: Service<UpdateItem>;
            link: Service<Link>;
            getItem: Service<GetItem>;
            deleteItem: Service<DeleteItem>;
            createItem: Service<CreateItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {
        const props: Partial<ConversationE['data']> = {};
        if (params.language !== undefined) {
            props.language = params.language;
        }
        if(Object.keys(props).length === 0){ 
            throw errorout({
                code: 'NoChanges'
            })
        }


        await depends.tajData.updateItem(
            {
                pk: UID_SCHEMA.conversations.parse(params.uid),
                props,
            },
            scope,
        );

        return {
            success: true
        }
    });
