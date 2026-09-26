import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { GetItem } from 'taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { mapUser, UserE } from '../../entities/User.js';
import { Def, serviceName } from './def.js';
import { CredentialE } from '../../entities/Credential.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItem: Service<GetItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {

        const item = (await depends.tajData.getItem({
            pk: UID_SCHEMA.users.parse(params.uid),
        }, scope)).data.item as UserE

        let emailVerified = false

        if(item.links.email?.id) {
            try {

                const credential = (await depends.tajData.getItem({
                    pk: {
                        cid: DATA_SCHEMA.collections.credentials,
                        id: item.links.email.id
                    },
                }, scope)).data.item as unknown as CredentialE

                emailVerified = credential.data.verified
            
            }
            catch(err) {
                console.error(err)
            }
        }


        return {
            user: mapUser(item),
            emailVerified,
        };
    });
