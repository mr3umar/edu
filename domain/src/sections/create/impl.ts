import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';
import { SectionE } from '../../entities/Section.js';

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
    createBaseService<Def>(serviceName, ["bookUid", "title"], async (params, scope, errorout, warn) => {
        const data: SectionE['data'] = {
            title: params.title,
        };

        const {pk} = UID_SCHEMA.books.generate()

        await depends.tajData.createItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.sections,
                    id: String(params.sectionIndex),
                    parent: UID_SCHEMA.books.parse(params.bookUid),
                    childKey: BookChildsKeys.sections,
                },
                data,
            },
            scope,
        );
        
        return {
            uid: `${params.bookUid}/${params.sectionIndex}`,
        };
    });
