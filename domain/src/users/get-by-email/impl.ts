import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, ItemPK, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';
import { UserE } from '../../entities/User.js';
import { CredentialE } from '../../entities/Credential.js';
import { GetItem } from 'taj-data-services';
import { GetUser } from '../get/index.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getItem: Service<GetItem>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        getUser: Service<GetUser>;
    },
) =>
    createBaseService<Def>(serviceName, ["email"], async (params, scope, errorout, warn) => {

        const linksRes = await depends.tajData.getLinks({
            pk: {
                cid: DATA_SCHEMA.collections.credentials,
                id: params.email
            },
            linkId: DATA_SCHEMA.links.credentials_user,
            point: 'a'
        }, scope)

        if(linksRes.data.links.length === 0) {
            errorout({
                code: 'NOT_FOUND'
            })
        }


        const user = (await depends.getUser({ 
            uid: UID_SCHEMA.users.toUid(linksRes.data.links[0].toPK as ItemPK)
         }, scope)).data.user

        return {
            user,
        };
    });
