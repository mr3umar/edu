import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { CreatePage } from '../../pages/index.js';
import { GetUpload } from '../index.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {
        pdfToImages: Context.PdfToImages;
    },
    depends: {
        createPage: Service<CreatePage>
        getUpload: Service<GetUpload>
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["bookUid", "uploadUid"], async (params, scope, errorout, warn) => {

        const upload = (await depends.getUpload({
            uid: params.uploadUid
        }, scope)).data.item

        // const result = await context.pdfToImages(scope, params.uploadUid)
        
        // await Promise.all(
        //     result.images.map(async (img, index) => {

        //         await depends.createPage({
        //             bookUid: params.bookUid,
        //             index,
        //             width: img.width,
        //             height: img.height,
        //             fileSize: img.size,
        //         }, scope)
        //     })
        // )
        
        return {
        };
    });
