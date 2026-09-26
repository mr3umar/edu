import { SectionE } from "../../entities/Section.js";

export const serviceName = 'createSection';
export type Def = {
    Params: {
        bookUid: string;
        sectionIndex: number;
        title: SectionE["data"]["title"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
