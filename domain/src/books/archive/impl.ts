import { GetItem, UpdateItem } from '@dija/taj-data-services';
import { createBaseService } from '../../common/base.js';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Context } from '../../context.js';
import { BookE } from '../../entities/Book.js';
import { Service } from '../../types.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {
        getClientIamId: Context.GetClientIamId,
        getClientUserId: Context.GetClientUserId,
        getSource: Context.GetSource
        getUserId: Context.GetUserId
    },
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

        if(before.data.archivedAt) {
            return {
                succeed: true
            }
        }

        const iam = await context.getClientIamId(scope)
        const userId = await context.getClientUserId(scope)
        const userGuid = `${iam}/${userId}`

        const props: Partial<BookE["data"]> = {};
        props.archivedAt = new Date().toISOString();
        props.archivedBy = userGuid;
        props.archivedVia = await context.getSource(scope);

        await depends.tajData.updateItem(
            {
                pk: UID_SCHEMA.books.parse(params.uid),
                props
            },
            scope,
        );

        return {
            succeed: true,
        };
    });
