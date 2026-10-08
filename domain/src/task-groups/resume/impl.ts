import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { GetLinkedItems, GetLinks, Link, UpdateItem } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../../config.js';
import { TaskGroupE } from '../../entities/TaskGroup.js';
import { Def, serviceName } from './def.js';
import { GetTask } from '../../tasks/get/index.js';
import { GetTaskGroup } from '../get/index.js';
import { CancelTask } from '../../tasks/cancel/index.js';
import { Context } from '../../context.js';
import { UpdateTaskGroup } from '../update/index.js';

export const createService = (
    context: {
        resumeTaskGroup: Context.resumeTaskGroup
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            updateItem: Service<UpdateItem>;
            link: Service<Link>;
        };
        getTaskGroup: Service<GetTaskGroup>;
        updateTaskGroup: Service<UpdateTaskGroup>;
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {

        await context.resumeTaskGroup(scope, params.uid)

        await depends.updateTaskGroup({
            uid: params.uid,
            status: 'running',
        }, scope)
        

        return {
            succeed: true
        }
    });
