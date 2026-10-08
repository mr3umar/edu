import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { GetItem } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../../config.js';
import { mapTask, TaskE } from '../../entities/Task.js';
import { Def, serviceName } from './def.js';
import { mapTaskGroup, TaskGroupE } from '../../entities/TaskGroup.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItem: Service<GetItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {
        const getRes = await depends.tajData.getItem(
            {
                pk: UID_SCHEMA.taskGroups.parse(params.uid),
            },
            scope,
        );

        const item = getRes.data!.item as unknown as TaskGroupE;
                
        return {
            item: mapTaskGroup(item),
        };
    });
