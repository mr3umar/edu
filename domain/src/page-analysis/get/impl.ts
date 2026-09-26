import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { GetItem } from '@dija/taj-data-services';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItem: Service<GetItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {
        // const getRes = await depends.tajData.getItem(
        //     {
        //         pk: UID_SCHEMA.books.parse(params.uid),
        //     },
        //     scope,
        // );

        // const item = getRes.data!.item as unknown as BookE;
                
        return {
            item: {
                uid: "",
                parts: [],
                words: []
            },
        };
    });
