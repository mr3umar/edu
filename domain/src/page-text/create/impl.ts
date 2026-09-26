import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';
import { PageTextE } from '../../entities/PageText.js';
import { BookTextChildsKeys } from '../../entities/BookText.js';

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
    createBaseService<Def>(serviceName, ["bookUid"], async (params, scope, errorout, warn) => {
        const data: PageTextE['data'] = {
            text: params.text,
        };

        const {pk} = UID_SCHEMA.books.generate()

        await depends.tajData.createItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.pageText,
                    id: String(params.pageIndex),
                    parent: UID_SCHEMA.bookText.parse(params.bookUid),
                    childKey: BookTextChildsKeys.pages,
                },
                data,
            },
            scope,
        );
        
        return {
            uid: `${params.bookUid}/${params.pageIndex}`,
        };
    });
