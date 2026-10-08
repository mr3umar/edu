import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Context } from '../../context.js';
import { TaskE } from '../../entities/Task.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['taskGroupUid',], async (params, scope, errorout, warn) => {

        
        const data: TaskE['data'] = {
            type: params.type,
            predecessorUids: params.predecessorUids,
            input: params.input,
        };

        const {pk} = UID_SCHEMA.tasks.generate(UID_SCHEMA.taskGroups.parse(params.taskGroupUid))


        await depends.tajData.createItem(
            {
                pk,
                data,
            },
            scope,
        );
        
        return {
            uid: UID_SCHEMA.tasks.toUid(pk),
        };
    });
