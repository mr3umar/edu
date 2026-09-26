import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';
import { UserE } from '../../entities/User.js';
import { CredentialE, mapCredential } from '../../entities/Credential.js';
import { GetItem } from 'taj-data-services';
import { GetUserByEmail } from '../get-by-email/index.js';
import { SignAccessKey } from '@dija/gormic-cloud-public';
import { Context } from '../../context.js';

export const createService = (
    context: {
                    getUserId: Context.GetUserId
                },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getItem: Service<GetItem>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        getUserByEmail: Service<GetUserByEmail>;
        cloud: {
            signAccessKey: Service<SignAccessKey>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["refreshToken"], async (params, scope, errorout, warn) => {

        const userId = await context.getUserId(scope)
                
        if(!userId) {
            throw errorout({
                code: 'MISSING_TOKEN'
            })
        }

        const signRes = await depends.cloud.signAccessKey(
            {
                iamId: "users",
                ownerId: userId,
                instanceIds: [],
            },
            scope,
        );

        return {
            accessToken: signRes.data.token,
            expiresIn: 900,
        };
    });
