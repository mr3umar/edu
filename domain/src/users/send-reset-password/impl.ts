import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { GetItem } from 'taj-data-services';
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
    createBaseService<Def>(serviceName, ["email"], async (params, scope, errorout, warn) => {

        return {
            succeed: true
        };
    });
