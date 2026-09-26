import { DeleteItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            deleteItem: Service<DeleteItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {
        await depends.tajData.deleteItem(
            {
                pk: UID_SCHEMA.books.parse(params.uid),
            },
            scope,
        );

        return {
            succeed: true,
        };
    });
