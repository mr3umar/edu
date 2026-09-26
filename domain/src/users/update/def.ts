import { UserE } from "../../entities/User.js";

export const serviceName = 'updateUser';
export type Def = {
    Params: {
        uid: string;
        name?: UserE["data"]["gender"];
        gender?: UserE["data"]["gender"];
        birthdate?: UserE["data"]["birthdate"];
        preferedLang?: UserE["data"]["preferedLang"];
    };
    Data: {
        success: boolean
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};
