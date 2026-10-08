import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { GetItems } from 'taj-data-services';
import { DATA_SCHEMA } from '../../config.js';
import { mapUser, UserE } from '../../entities/User.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItems: Service<GetItems>;
        };
    },
) =>
    createBaseService<Def>(serviceName, [], async (params, scope, errorout, warn) => {

        const {items, next} = (await depends.tajData.getItems({
            fromPK: {
                cid: DATA_SCHEMA.collections.users,
                id: params.query?.offset
            },
            sort: params.query?.sort
        }, scope)).data



        return {
            items: items.map(it => mapUser(it as UserE)),
            next: next ? next.id : undefined,
        };
    });
