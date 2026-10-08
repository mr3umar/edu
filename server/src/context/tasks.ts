import { Context } from "edu-ai-domain";
import { SERVICES } from "../index-new.js";
import { Deferred } from "../deferred.js";


export const createTasksContext = () => {

        const startTask: Context.startTask = async (scope, taskUid) => {

                if (!SERVICES) {
                        console.error(`System is on init state.`)
                        throw new Error(`System is on init state.`)
                }
                const { task, taskGroup } = (await SERVICES.getTask({ uid: taskUid, include: ["taskGroup"] }, scope)).data

                const pausedDef = pausedTaskGroups[task.taskGroupUid]
                if(pausedDef) {
                        console.log(`Task ${task.uid} (${task.type}), paused`);
                        await pausedDef.promise
                        console.log(`Task ${task.uid} (${task.type}), resumed`);
                }

                if(task.status == "canceled" || task.status == "completed") {
                        console.log(`Task ${task.uid} (${task.type}), skipped, status: ${task.status}`);
                        return;
                }
                if(taskGroup?.status == "canceled" || taskGroup?.status == "completed") {
                        console.log(`Task ${task.uid} (${task.type}), skipped, task group status: ${taskGroup?.status}`);
                        return;
                }

                console.log(`Starting task ${taskUid} (${task.type})..`)


                switch (task.type) {
                        case "text-steps":

                                void SERVICES.executeSendText({
                                        taskUid: taskUid
                                }, scope)
                                        .catch((err: any) => {
                                                console.error(`cannot start task ${taskUid}. Error: ${err.message}`)
                                        })

                                break;

                        case "step-processing":

                                void SERVICES.executeProcessTextStep({ taskUid: taskUid }, scope)
                                        .catch((err: any) => {
                                                console.error(`cannot start task ${taskUid}. Error: ${err.message}`)
                                        })

                                break;

                        case "tts-prepare":

                                void SERVICES.executeTTSPrepare({ taskUid: taskUid }, scope)
                                        .catch((err: any) => {
                                                console.error(`cannot start task ${taskUid}. Error: ${err.message}`)
                                        })

                                break;


                        case "validate-board":

                                void SERVICES.executeValidateBoard({ taskUid: taskUid }, scope)
                                        .catch((err: any) => {
                                                console.error(`cannot start task ${taskUid}. Error: ${err.message}`)
                                        })

                                break;

                        case "pre-tts":

                                void SERVICES.executePreTTS({ taskUid: taskUid }, scope)
                                        .catch((err: any) => {
                                                console.error(`cannot start task ${taskUid}. Error: ${err.message}`)
                                        })

                                break;

                        case "tts":

                                void SERVICES.executeTTS({ taskUid: taskUid }, scope)
                                        .catch((err: any) => {
                                                console.error(`cannot start task ${taskUid}. Error: ${err.message}`)
                                        })

                                break;

                        default:
                                throw new Error('UNSUPPORTED_TASK_TYPE')
                }
        }
        const cancelTask: Context.cancelTask = async (scope, taskUid) => {

                const { task } = (await SERVICES!.getTask({ uid: taskUid }, scope)).data

                const abortController = await getTaskAbortContoller(scope, taskUid)
                abortController?.abort()

                const pausedDef = pausedTaskGroups[task.taskGroupUid]
                if(pausedDef) {
                        pausedDef.reject(new Error("task is canceled"))
                }
        }


        const controllers: {[key: string]: AbortController} = {}

        const getTaskAbortContoller: Context.getTaskAbortContoller = async (scope, taskUid) => {

                if(!controllers[taskUid]) {
                        controllers[taskUid] = new AbortController()
                }
        
                return controllers[taskUid]
        }

        const pausedTaskGroups: {[key: string]: Deferred<void>} = {}
        const pauseTaskGroup: Context.pauseTaskGroup = async (scope, taskGroupUid) => {
                if(pausedTaskGroups[taskGroupUid]) {
                        return
                }
                pausedTaskGroups[taskGroupUid] = new Deferred()
        }
        const resumeTaskGroup: Context.resumeTaskGroup = async (scope, taskGroupUid) => {
                if(pausedTaskGroups[taskGroupUid]) {
                        pausedTaskGroups[taskGroupUid].resolve()
                }
        }

        return {
                startTask,
                cancelTask,
                pauseTaskGroup,
                resumeTaskGroup,
                getTaskAbortContoller,
        }
}


