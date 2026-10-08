import { createBaseService } from '@dija/gormic-service-kit-domain';
import { Def, serviceName } from './def.js';

export const createService = (
    context: {
        // getTaskAbortContoller: Context.getTaskAbortContoller
    },
    depends: {
    },
) =>
    createBaseService<Def>(serviceName, ["uid"], async (params, scope, errorout, warn) => {
        

        return {
            succeed: true
        }
    });
