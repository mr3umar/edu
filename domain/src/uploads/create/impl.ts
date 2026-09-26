import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["bookUid", "fileSize", "height", "index", "width"], async (params, scope, errorout, warn) => {
        const data: PageE['data'] = {
            width: params.width,
            height: params.height,
            fileSize: params.fileSize,
            pageNumber: params.pageNumber,
        };

        const {pk} = UID_SCHEMA.books.generate()

        await depends.tajData.createItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.pages,
                    id: String(params.index),
                    parent: UID_SCHEMA.books.parse(params.bookUid),
                },
                data,
            },
            scope,
        );
        
        return {
            uid: `${params.bookUid}/${params.index}`,
        };
    });
