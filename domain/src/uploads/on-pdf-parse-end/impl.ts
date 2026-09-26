import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { CreatePage, UpdatePage } from '../../pages/index.js';
import { GetUpload } from '../index.js';
import { Def, serviceName } from './def.js';
import { AnalyzeBook, GetBook, UpdateBook } from '../../books/index.js';
import { CreatePageText } from '../../page-text/index.js';
import { PageId } from '../../entities/Page.js';

export const createService = (
    context: {
        pdfToImages: Context.PdfToImages;
        extractText: Context.extractText;
    },
    depends: {
        createPage: Service<CreatePage>
        getUpload: Service<GetUpload>
        getBook: Service<GetBook>
        updateBook: Service<UpdateBook>
        createPageText: Service<CreatePageText>
        analyzeBook: Service<AnalyzeBook>
        updatePage: Service<UpdatePage>;
        tajData: {
            getLinks: Service<GetLinks>;
            getLinkedItems: Service<GetLinkedItems>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["uploadUid"], async (params, scope, errorout, warn) => {

        const upload = (await depends.getUpload({
            uid: params.uploadUid
        }, scope)).data.item

        const book = (await depends.getBook({
            uid: upload.bookUid!
        }, scope)).data.item

        for(const page of book.pages){

            if(page.index > 50) {
                await depends.updatePage({
                    uid: PageId.toUid(upload.bookUid!, page.index),
                    textExtracted: false,
                }, scope)
                continue;
            }
            try {
                const text = await context.extractText(scope, upload.bookUid!, page.index)
                await depends.createPageText({
                    bookUid: upload.bookUid!,
                    pageIndex: page.index,
                    text
                }, scope) 

                await depends.updatePage({
                    uid: PageId.toUid(upload.bookUid!, page.index),
                    textExtracted: true,
                }, scope)

                console.log(`Text extracted of page ${page.index}, bookUid: ${book.uid}`)
            }  
            catch(err) {
                await depends.createPageText({
                    bookUid: upload.bookUid!,
                    pageIndex: page.index,
                    text: ""
                }, scope) 
                await depends.updatePage({
                    uid: PageId.toUid(upload.bookUid!, page.index),
                    textExtracted: false,
                }, scope)
                console.error(`Cannot extract text of page ${page.index}, bookUid: ${book.uid}`)
            }
        }

        await depends.analyzeBook({
            uid: upload.bookUid!,
        }, scope)

        return {
        };
    });
