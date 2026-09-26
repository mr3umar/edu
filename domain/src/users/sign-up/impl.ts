import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { GetItem } from 'taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { CredentialE, CredentialLinkKeys } from '../../entities/Credential.js';
import { UserE, UserLinkKeys } from '../../entities/User.js';
import { GetUserByEmail } from '../get-by-email/index.js';
import { Def, serviceName } from './def.js';

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
        getUserByEmail: Service<GetUserByEmail>;
    },
) =>
    createBaseService<Def>(serviceName, ["email", "password"], async (params, scope, errorout, warn) => {

        const linksRes = await depends.tajData.getLinks({
            pk: {
                cid: DATA_SCHEMA.collections.credentials,
                id: params.email
            },
            linkId: DATA_SCHEMA.links.credentials_user,
            point: 'a'
        }, scope)

        if(linksRes.data.links.length > 0) {
            errorout({
                code: 'ALREADY_REGISTERED'
            })
        }


        {
            const data: CredentialE['data'] = {
                passwordHash: params.password,
                verified: false
            };
            await depends.tajData.createItem(
                {
                    pk: {
                        cid: DATA_SCHEMA.collections.credentials,
                        id: params.email,
                    },
                    data,
                },
                scope,
            );
        }

        {

            const data: UserE['data'] = {
                
            };

            const {pk} = UID_SCHEMA.users.generate()
            await depends.tajData.createItem(
                {
                    pk,
                    data,
                },
                scope,
            );

            await depends.tajData.link({
                aPK: {
                    cid: DATA_SCHEMA.collections.credentials,
                    id: params.email,
                },
                bPK: pk,
                linkId: DATA_SCHEMA.links.credentials_user,
                aKey: UserLinkKeys.email,
                bKey: CredentialLinkKeys.user,
                bAutoUnlink: false,
            }, scope)
        
        }

        const user = (await depends.getUserByEmail({
            email: params.email
        }, scope)).data.user

        return {
            user,
            emailVerified: false,
        };
    });
