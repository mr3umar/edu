import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { PageId } from '../../entities/Page.js';
import { Def, serviceName } from './def.js';
import { CreatePageAnalysis } from '../../page-analysis/create/index.js';
import { GetBook } from '../../books/index.js';

export const createService = (
    context: {
        analyzePage: Context.analyzePage
    },
    depends: {
        tajData: {
            getLinkedItems: Service<GetLinkedItems>;
            getLinks: Service<GetLinks>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
        createPageAnalysis: Service<CreatePageAnalysis>;
        getBook: Service<GetBook>;
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {

        const {bookUid, pageIndex} = PageId.parse(params.uid)

        const book = (await depends.getBook({uid: bookUid}, scope)).data.item

        const page = book.pages[pageIndex]

        if(!page) {
            throw errorout({
                code: "NotFound"
            })
        }

        const analysis = await context.analyzePage(scope, bookUid, pageIndex, page.width, page.height)
        
        const createRes = await depends.createPageAnalysis({
            bookUid,
            pageIndex,
            parts: analysis.parts,
            words: analysis.words,
        }, scope)

        return {
            pageAnalysisUid: createRes.data.uid
        }
    });
