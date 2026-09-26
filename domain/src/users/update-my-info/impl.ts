import { CreateItem, DeleteItem, GetItem, Link, UpdateItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE } from '../../entities/Book.js';
import { UpdateUser } from '../update/index.js';
import { Context } from '../../context.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
    },
    depends: {
        tajData: {
            updateItem: Service<UpdateItem>;
            link: Service<Link>;
            getItem: Service<GetItem>;
            deleteItem: Service<DeleteItem>;
            createItem: Service<CreateItem>;
        };
        updateUser: Service<UpdateUser>;
    },
) =>
    createBaseService<Def>(serviceName, [], async (params, scope, errorout, warn) => {
        
        
        const userId = await context.getUserId(scope)

        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }

        return (await depends.updateUser({
            ...params,
            uid: userId,
        }, scope)).data

    });
