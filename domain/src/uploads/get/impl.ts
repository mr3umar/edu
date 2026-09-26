import { GetItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE, mapBook } from '../../entities/Book.js';
import { mapUpload, UploadE } from '../../entities/Upload.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItem: Service<GetItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {
        const getRes = await depends.tajData.getItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.uploads,
                    id: params.uid,
                },
            },
            scope,
        );

        const item = getRes.data!.item as unknown as UploadE;
                
        return {
            item: mapUpload(item),
        };
    });
