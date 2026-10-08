import { ListQueryParams } from "@dija/gormic-service-kit-domain";
import { UserM } from "../../entities/User.js";

export const serviceName = 'listUsers';
export type Def = {
    Params: {
            query?: ListQueryParams<never, never>
    };
    Data: {
        items: UserM[];
        next?: string;
    };
    ErrorCodes: never;
};
