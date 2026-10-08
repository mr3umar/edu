import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { GetItem } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../../config.js';
import { mapTask, TaskE } from '../../entities/Task.js';
import { Def, serviceName } from './def.js';
import { GetTaskGroup } from '../../task-groups/index.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItem: Service<GetItem>;
        };
        getTaskGroup: Service<GetTaskGroup>;
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {

        const [taskGroupUid, taskId] = params.uid.split("/")

        const taskGroup = (await depends.getTaskGroup({
            uid: taskGroupUid
        }, scope)).data.item
                
        const task = taskGroup.tasks.find(t => t.uid == params.uid)

        if(!task) {
            throw errorout({
                code: 'NotFound'
            })
        }

        return {
            task,
            taskGroup: params.include?.includes("taskGroup") ? taskGroup : undefined,
            predecessors: params.include?.includes("predecessors") ? taskGroup.tasks.filter(t => task.predecessorUids?.includes(t.uid)) : undefined,
            // groupTasks: params.include?.includes("groupTasks") ? taskGroup.tasks : undefined,
        };
    });
