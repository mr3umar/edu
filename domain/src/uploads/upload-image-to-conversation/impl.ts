import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Context } from '../../context.js';
import { UploadE, UploadLinkKeys } from '../../entities/Upload.js';
import { Def, serviceName } from './def.js';
import { BookLinkKeys } from '../../entities/Book.js';
import { ProcessPdf } from '../process-pdf/index.js';
import { CreateBook } from '../../books/index.js';
import { CreateTask } from '../../tasks/index.js';
import { CreateTaskGroup } from '../../task-groups/index.js';
import { TextStepsInput, UploadedImageInput } from '../../entities/Task.js';

export const createService = (
    context: {
        appendFile: Context.AppendFile;
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        // createBook: Service<CreateBook>
        // processPdf: Service<ProcessPdf>
        createTaskGroup: Service<CreateTaskGroup>
        createTask: Service<CreateTask>
    },
) =>
    createBaseService<Def>(serviceName, ["fileId", "fileName", "fileSize", "conversationUid"], async (params, scope, errorout, warn) => {

        console.log(params.chunkIndex, params.completed, ">>>>")
        if(params.chunkIndex === 0) {
            const data: UploadE['data'] = {
                fileName: params.fileName,
                size: params.fileName,
            };

            await depends.tajData.createItem(
                {
                    pk: {
                        cid: DATA_SCHEMA.collections.uploads,
                        id: params.fileId
                    },
                    data,
                },
                scope,
            );
        }

        if(!params.completed) {
            await context.appendFile(scope, "conv-uploaded-image", params.fileId, params.fileName, params.fileSize, false, params.chunkIndex!, params.chunk)
        }
        
        if(params.completed) {

            await context.appendFile(scope, "conv-uploaded-image", params.fileId, params.fileName, params.fileSize, true)

            const taskGroupUid = (await depends.createTaskGroup({
                    conversationUid: params.conversationUid,
                    clientRequestId: "",
            }, scope)).data.uid


            const input: UploadedImageInput = {
                    uploadUid: params.fileId
            }
            const taskRes = (await depends.createTask({
                    taskGroupUid,
                    type: 'uploaded-image',
                    input,
            }, scope)).data

            return {
                progressPercent: 100,
                uploadUid: params.fileId,
            };
        }
        
        return {
            progressPercent: 50,
        };
    });
