import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookE, BookLinkKeys } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { Context } from '../../context.js';

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
    createBaseService<Def>(serviceName, [], async (params, scope, errorout, warn) => {

        const userId = await context.getUserId(scope)

        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }
        
        const data: BookE['data'] = {
            title: params.title,
            language: params.language,
        };

        const pk = params.id ? {
            cid: DATA_SCHEMA.collections.books,
            id: params.id
        } : UID_SCHEMA.books.generate().pk

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
            linkId: DATA_SCHEMA.links.user_book,
            aKey: BookLinkKeys.user,
        }, scope)
        
        return {
            uid: UID_SCHEMA.books.toUid(pk),
        };
    });
