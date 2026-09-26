import { CreateItem, DeleteItem, GetItem, Link, UpdateItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { PageE, PageId } from '../../entities/Page.js';

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
        const props: Partial<PageE['data']> = {};
        if (params.width !== undefined) {
            props.width = params.width;
        }
        if (params.height !== undefined) {
            props.height = params.height;
        }
        if (params.fileSize !== undefined) {
            props.fileSize = params.fileSize;
        }
        if (params.pageNumber !== undefined) {
            props.pageNumber = params.pageNumber;
        }
        if (params.sectionId !== undefined) {
            props.sectionId = params.sectionId;
        }
        if (params.textExtracted !== undefined) {
            props.textExtracted = params.textExtracted;
        }
        if(Object.keys(props).length === 0){ 
            throw errorout({
                code: 'NoChanges'
            })
        }

        const {bookUid, pageIndex} = PageId.parse(params.uid)

        await depends.tajData.updateItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.pages,
                    id: String(pageIndex),
                    parent: UID_SCHEMA.books.parse(bookUid),
                    childKey: BookChildsKeys.pages,
                },
                props,
            },
            scope,
        );

        return {
            success: true
        }
    });
