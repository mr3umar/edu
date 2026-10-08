import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { GetLinkedItems, GetLinks, Link, UpdateItem } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { UpdateTask } from '../update/index.js';
import { Def, serviceName } from './def.js';
import { GetTask } from '../get/index.js';

export const createService = (
    context: {
        // getTaskAbortContoller: Context.getTaskAbortContoller
        cancelTask: Context.cancelTask
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            updateItem: Service<UpdateItem>;
            link: Service<Link>;
        };
        updateTask: Service<UpdateTask>;
                getTask: Service<GetTask>;
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {
        
        // const abortController = await context.getTaskAbortContoller(scope, params.uid)

        const {task, taskGroup} = (await depends.getTask({uid: params.uid, include: ["taskGroup"]}, scope)).data

        console.log(`## Canceling task ${params.uid} (${task.type})`)
        
        
        if(task.status == "canceled" || task.status == "completed") {
            console.warn(`No need to cancel task ${params.uid}, it is already ${task.status}`)
            return {
                succeed: true
            }
        }

        await context.cancelTask(scope, params.uid)

        await depends.updateTask(
            {
                uid: params.uid,
                status: "canceled"
            },
            scope,
        );

        return {
            succeed: true
        }
    });
