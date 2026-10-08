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
    createBaseService<Def>(serviceName, ["name", "args"], async (params, scope, errorout, warn) => {

        throw new Error(`not yet implemented`)
        ;
        return {
            output: {}
        }
    });
