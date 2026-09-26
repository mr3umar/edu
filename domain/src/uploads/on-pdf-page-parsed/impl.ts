import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { CreatePage } from '../../pages/index.js';
import { GetUpload } from '../index.js';
import { Def, serviceName } from './def.js';
import { UpdateBook } from '../../books/index.js';
import { CreatePageText } from '../../page-text/index.js';

export const createService = (
    context: {
        pdfToImages: Context.PdfToImages;
        extractText: Context.extractText;
    },
    depends: {
        createPage: Service<CreatePage>
        getUpload: Service<GetUpload>
        updateBook: Service<UpdateBook>
        createPageText: Service<CreatePageText>
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["fileSize", "height", "uploadUid", "pageIndex", "width"], async (params, scope, errorout, warn) => {

        const upload = (await depends.getUpload({
            uid: params.uploadUid
        }, scope)).data.item

        await depends.createPage({
            bookUid: upload.bookUid!,
            pageIndex: params.pageIndex,
            width: params.width,
            height: params.height,
            fileSize: params.fileSize,
        }, scope)


        return {
        };
    });
