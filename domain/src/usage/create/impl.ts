import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';
import { UsageE } from '../../entities/Usage.js';

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
    createBaseService<Def>(serviceName, ['model', 'task', 'cost', 'type'], async (params, scope, errorout, warn) => {
        const data: UsageE['data'] = {
            model: params.model,
            task: params.task,
            type: params.type,
            cost: params.cost,
            tokens: params.tokens,
            charactersCount: params.charactersCount,
            audioMin: params.audioMin,
            info: params.info,
        };

        const {pk, uid} = UID_SCHEMA.usages.generate()

        await depends.tajData.createItem(
            {
                pk,
                data,
            },
            scope,
        );
        
        return {
            uid
        };
    });
