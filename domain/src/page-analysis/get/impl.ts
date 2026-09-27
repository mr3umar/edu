import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { GetItem } from '@dija/taj-data-services';
import { DATA_SCHEMA } from '../../config.js';
import { PageId } from '../../entities/Page.js';
import { mapPageAnalysis, PageAnalysisE } from '../../entities/PageAnalysis.js';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {},
    depends: {
        tajData: {
            getItem: Service<GetItem>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ['uid'], async (params, scope, errorout, warn) => {

        const {bookUid, pageIndex} = PageId.parse(params.uid)
        

        const getRes = await depends.tajData.getItem(
            {
                pk: {
                    cid: DATA_SCHEMA.collections.pageAnalysis,
                    pid: bookUid,
                    id: String(pageIndex)
                },
            },
            scope,
        );

        const item = getRes.data!.item as unknown as PageAnalysisE;

        return {
            item: mapPageAnalysis(item)
        };
    });
