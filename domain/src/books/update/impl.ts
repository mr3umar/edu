import { CreateItem, DeleteItem, GetItem, Link, UpdateItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE } from '../../entities/Book.js';

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
        const props: Partial<BookE['data']> = {};
        if (params.title !== undefined) {
            props.title = params.title;
        }
        if (params.language !== undefined) {
            props.language = params.language;
        }
        if (params.pagesCount !== undefined) {
            props.pagesCount = params.pagesCount;
        }
        if(Object.keys(props).length === 0){ 
            throw errorout({
                code: 'NoChanges'
            })
        }


        await depends.tajData.updateItem(
            {
                pk: UID_SCHEMA.books.parse(params.uid),
                props,
            },
            scope,
        );

        return {
            success: true
        }
    });
