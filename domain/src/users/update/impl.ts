import { CreateItem, DeleteItem, GetItem, Link, UpdateItem } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE } from '../../entities/Book.js';
import { UserE } from '../../entities/User.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            updateItem: Service<UpdateItem>;
            link: Service<Link>;
            getItem: Service<GetItem>;
            deleteItem: Service<DeleteItem>;
            createItem: Service<CreateItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {
        const props: Partial<UserE['data']> = {};
        if (params.name !== undefined) {
            props.name = params.name;
        }
        if (params.gender !== undefined) {
            props.gender = params.gender;
        }
        if (params.birthdate !== undefined) {
            props.birthdate = params.birthdate;
        }
        if (params.preferedLang !== undefined) {
            props.preferedLang = params.preferedLang;
        }

        if(Object.keys(props).length > 0){
            await depends.tajData.updateItem(
                {
                    pk: UID_SCHEMA.users.parse(params.uid),
                    props,
                },
                scope,
            );
        }


        return {
            success: true
        }
    });
