import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Context } from '../../context.js';
import { UploadE, UploadLinkKeys } from '../../entities/Upload.js';
import { Def, serviceName } from './def.js';
import { BookLinkKeys } from '../../entities/Book.js';
import { ProcessPdf } from '../process-pdf/index.js';
import { CreateBook } from '../../books/index.js';

export const createService = (
    context: {
        appendFile: Context.AppendFile;
        pdfToImages: Context.PdfToImages;
    },
    depends: {
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        createBook: Service<CreateBook>
        processPdf: Service<ProcessPdf>
    },
) =>
    createBaseService<Def>(serviceName, ["fileId", "fileName", "fileSize"], async (params, scope, errorout, warn) => {

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
            await context.appendFile(scope, "pdf", params.fileId, params.fileName, params.fileSize, false, params.chunkIndex!, params.chunk)
        }
        
        if(params.completed) {

            await context.appendFile(scope, "pdf", params.fileId, params.fileName, params.fileSize, true)

            const bookUid = (await depends.createBook({
                id: params.fileId,
                title: params.fileName,
            }, scope)).data.uid

            await depends.tajData.link({
                aPK: UID_SCHEMA.books.parse(bookUid),
                bPK: {
                    cid: DATA_SCHEMA.collections.uploads,
                    id: params.fileId,
                },
                linkId: DATA_SCHEMA.links.book_pdf,
                aKey: UploadLinkKeys.book,
                bKey: BookLinkKeys.pdf,
                bAutoUnlink: false,
            }, scope)

            // await depends.processPdf({
            //     bookUid,
            //     uploadUid: params.fileId,
            // }, scope)

            await context.pdfToImages(scope, params.fileId)

            return {
                progressPercent: 100,
                uploadUid: params.fileId,
                bookUid,
            };
        }
        
        return {
            progressPercent: 50,
        };
    });
