import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../../context.js';
import { CreateTask } from '../../create/index.js';
import { GetTask } from '../../get/index.js';
import { PreTTS } from '../../pre-tts/index.js';
import { OpenaiValidateBoard } from '../../../openai/validate-board/index.js';
import { StartTask } from '../../start/index.js';
import { UpdateTask } from '../../update/index.js';
import { Def, serviceName } from './def.js';

export const createService = (
        context: {
                getClientLanguage: Context.getClientLanguage
        },
        depends: {
                tajData: {
                        getLinks: Service<GetLinks>;
                        getLinkedItems: Service<GetLinkedItems>;
                        createItem: Service<CreateItem>;
                        link: Service<Link>;
                };
                getTask: Service<GetTask>;
                createTask: Service<CreateTask>;
                startTask: Service<StartTask>;
                openaiValidateBoard: Service<OpenaiValidateBoard>;
                preTTS: Service<PreTTS>;
                updateTask: Service<UpdateTask>;
        },
) =>
        createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {
                
                const {output} = (
                        await depends.openaiValidateBoard({
                        taskUid: params.taskUid,
                        }, scope)).data

                await depends.updateTask({
                        uid: params.taskUid,
                        status: "completed",
                        output,
                }, scope)

                return {
                };
        });
