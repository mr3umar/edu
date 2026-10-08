import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { GetLinkedItems, GetLinks, Link, UpdateItem } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../../config.js';
import { TaskE } from '../../entities/Task.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            updateItem: Service<UpdateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {
        const props: Partial<TaskE['data']> = {};
        if (params.status !== undefined) {
            props.status = params.status;
        }
        if (params.output !== undefined) {
            props.output = params.output;
        }
        if(Object.keys(props).length === 0){ 
            throw errorout({
                code: 'NoChanges'
            })
        }


        await depends.tajData.updateItem(
            {
                pk: UID_SCHEMA.tasks.parse(params.uid),
                props,
            },
            scope,
        );

        return {
            succeed: true
        }
    });
