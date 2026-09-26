import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { GetItems, GetLinkedItems } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { Def, serviceName } from './def.js';
import { ListBooks } from '../list/index.js';

export const createService = (
    context: {
                getUserId: Context.GetUserId
            },
    depends: {
        tajData: {
            getItems: Service<GetItems>;
            getLinkedItems: Service<GetLinkedItems>;
        };
        listBooks: Service<ListBooks>;
    },
) =>
    createBaseService<Def>(serviceName, [], async (params, scope, errorout, warn) => {
        const userId = await context.getUserId(scope)
                
        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }

        const {items, next} = (await depends.listBooks({
            userUid: userId
        }, scope)).data

        
        return {
            items: items.filter(it => !it.archivedAt),
            next,
        }
    });
