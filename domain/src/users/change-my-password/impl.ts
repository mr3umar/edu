import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link, UpdateItem } from '@dija/taj-data-services';
import { GetItem } from 'taj-data-services';
import { GetUserByEmail } from '../get-by-email/index.js';
import { Def, serviceName } from './def.js';
import { DATA_SCHEMA } from '../../config.js';
import { CredentialE } from '../../entities/Credential.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getItem: Service<GetItem>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
            updateItem: Service<UpdateItem>;
        };
        getUserByEmail: Service<GetUserByEmail>;
    },
) =>
    createBaseService<Def>(serviceName, ["newPassword", "oldPassword"], async (params, scope, errorout, warn) => {

        // TODO: check params token email

        // const props: Partial<CredentialE["data"]> = {
        //     passwordHash: params.newPassword
        // }

        // await depends.tajData.update({
        //     pk: {
        //         cid: DATA_SCHEMA.collections.credentials,
        //         id: params.token.email
        //     },
        //     props
        // }, scope)

        return {
            succeed: true
        };
    });
