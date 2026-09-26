import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';
import { mapUser, UserE } from '../../entities/User.js';
import { CredentialE } from '../../entities/Credential.js';
import { GetItem } from 'taj-data-services';
import { Context } from '../../context.js';
import { GetUser } from '../get/index.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
    },
    depends: {
        tajData: {
            getItem: Service<GetItem>;
        };
        getUser: Service<GetUser>;
    },
) =>
    createBaseService<Def>(serviceName, [], async (params, scope, errorout, warn) => {

        const userId = await context.getUserId(scope)

        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }

        return (await depends.getUser({
            uid: userId
        }, scope)).data
    });
