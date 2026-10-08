import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { GetLinkedItems, GetLinks, Link, UpdateItem } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../../config.js';
import { TaskGroupE } from '../../entities/TaskGroup.js';
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
        const props: Partial<TaskGroupE['data']> = {};
        if (params.status !== undefined) {
            props.status = params.status;
        }
        // if (params.response !== undefined) {
        //     props.response = params.response;
        // }
        if(params.status == "completed") {
            props.completedAt = new Date().toISOString()
        }
        if(Object.keys(props).length === 0){ 
            throw errorout({
                code: 'NoChanges'
            })
        }


        await depends.tajData.updateItem(
            {
                pk: UID_SCHEMA.taskGroups.parse(params.uid),
                props,
            },
            scope,
        );

        return {
            succeed: true
        }
    });
