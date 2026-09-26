import { Service, createBaseService, isServiceError } from '@dija/gormic-service-kit-domain';
import { SignAccessKey} from '@dija/gormic-cloud-public';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { BookChildsKeys, BookE } from '../../entities/Book.js';
import { Def, serviceName } from './def.js';
import { PageE } from '../../entities/Page.js';
import { UserE } from '../../entities/User.js';
import { CredentialE, mapCredential } from '../../entities/Credential.js';
import { GetItem } from 'taj-data-services';
import { GetUserByEmail } from '../get-by-email/index.js';

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
        cloud: {
            signAccessKey: Service<SignAccessKey>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["email", "password"], async (params, scope, errorout, warn) => {


        const credentialItem = await depends.tajData.getItem({
            pk: {
                cid: DATA_SCHEMA.collections.credentials,
                id: params.email
            }
        }, scope)
        .then(res => {
            return res.data.item as unknown as CredentialE
        })
        .catch(err => {
            if(isServiceError(err) && err.result.error?.code == "NotFound") {
                throw errorout({
                    code: "INCORRECT_CREDENTIAL"
                })
            }
            throw err
        })

        const credentialMap = mapCredential(credentialItem)

        if(credentialMap.passwordHash != params.password) {
            errorout({
                code: 'INCORRECT_CREDENTIAL'
            })
        }

        const user = (await depends.getUserByEmail({
            email: params.email
        }, scope)).data.user


        const signRes = await depends.cloud.signAccessKey(
            {
                iamId: "users",
                ownerId: user.uid,
                instanceIds: [],
            },
            scope,
        );

        return {
            user,
            emailVerified: credentialItem.data.verified,
            accessToken: signRes.data.token,
            expiresIn: 900,
            refreshToken: signRes.data.token,
        };
    });
