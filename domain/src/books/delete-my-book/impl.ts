import { DeleteItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { ArchiveBook } from '../archive/index.js';
import { GetBook } from '../get/index.js';
import { Context } from '../../context.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
    },
    depends: {
        tajData: {
            deleteItem: Service<DeleteItem>;
        };
        archiveBook: Service<ArchiveBook>;
        getBook: Service<GetBook>;
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {

        const userId = await context.getUserId(scope)
                
        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }

        const book = (await depends.getBook({uid: params.uid}, scope)).data.item

        if(book.userUid != userId) {

            throw errorout({
                code: 'UNAUTHORIZED'
            })
        }

        await depends.archiveBook(
            {
                uid: params.uid,
            },
            scope,
        );

        return {
            succeed: true,
        };
    });
