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
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            updateItem: Service<UpdateItem>;
            link: Service<Link>;
        };
        getTaskGroup: Service<GetTaskGroup>;
        cancelTask: Service<CancelTask>;
        updateTaskGroup: Service<UpdateTaskGroup>;
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {
        
        console.log(`## Canceling by groupt ${params.uid}`)

        const taskGroup = (await depends.getTaskGroup({
            uid: params.uid
        }, scope)).data.item


        if(taskGroup.status == "canceled" || taskGroup.status == "completed") {
            console.warn(`No need to cancel task group ${params.uid}, it is already ${taskGroup.status}`)
            return {
                succeed: true
            }
        }

        await depends.updateTaskGroup(
            {
                uid: params.uid,
                status: "canceled"
            },
            scope,
        );

        await Promise.all(taskGroup.tasks.map(async task => {
            if(task.status !== "canceled" && task.status != "completed") {

                await depends.cancelTask({
                    uid: task.uid
                }, scope)
            }
        }))

        return {
            succeed: true
        }
    });
