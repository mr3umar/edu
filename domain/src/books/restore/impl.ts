import { GetItem, UpdateItem } from '@dija/taj-data-services';
import { createBaseService } from '../../common/base.js';
import { DATA_SCHEMA } from '../../config.js';
import { BookE } from '../../entities/Book.js';
import { Service } from '../../types.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItem: Service<GetItem>;
            updateItem: Service<UpdateItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {
        // validate existence
        const before = (await depends.tajData.getItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.books,
                    id: params.uid,
                },
            },
            scope
        )).data.item as unknown as BookE;

        if(before.data.archivedAt === undefined) {
            return {
                succeed: true
            }
        }

        const props: Partial<BookE["data"]> = {};
        props.archivedAt = null;
        props.archivedBy = null;
        props.archivedVia = null;

        await depends.tajData.updateItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.books,
                    id: params.uid,
                },
                props
            },
            scope,
        );

        return {
            succeed: true,
        };
    });
