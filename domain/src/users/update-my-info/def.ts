import { UserE } from "../../entities/User.js";
import { UpdateUser } from "../update/index.js";

export const serviceName = 'updateMyInfo';
export type Def = {
    Params: {
        name?: UserE["data"]["gender"];
        gender?: UserE["data"]["gender"];
        birthdate?: UserE["data"]["birthdate"];
        preferedLang?: UserE["data"]["preferedLang"];
    };
    Data: UpdateUser["Data"];
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};
