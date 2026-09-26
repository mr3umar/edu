import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { CreatePage } from '../../pages/index.js';
import { GetUpload } from '../index.js';
import { Def, serviceName } from './def.js';
import { UpdateBook } from '../../books/index.js';

export const createService = (
    context: {
        pdfToImages: Context.PdfToImages;
    },
    depends: {
        createPage: Service<CreatePage>
        getUpload: Service<GetUpload>
        updateBook: Service<UpdateBook>
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["pagesCount", "uploadUid"], async (params, scope, errorout, warn) => {

        const upload = (await depends.getUpload({
            uid: params.uploadUid
        }, scope)).data.item


        console.log({
            uid: upload.bookUid!,
            title: params.title,
            pagesCount: params.pagesCount,
        }, 4444)
        await depends.updateBook({
            uid: upload.bookUid!,
            title: params.title,
            pagesCount: params.pagesCount,
        }, scope)
        
        return {
        };
    });
