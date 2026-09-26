import { ItemPK } from '@dija/taj-data-services';

type Aliases = Record<string, string>;
function toUid(pk: ItemPK, pid?: string): string {
    const parentUid = pk.parent ? toUid(pk.parent, pid) : undefined;
    return `${pid ? `${pid}:` : ''}${parentUid ? `${parentUid}/` : ''}${pk.id}`;
}

export const PK = {
    toUid: (pk: ItemPK) => {
        return toUid(pk, pk.pid);
    },
    parse: (uid: string, collectionHeirarchy: string[]) => {
        const strs = uid.split(':');
        const pid = strs.length > 1 ? strs[0] : undefined;
        const heirIds = (strs.length > 1 ? strs[1] : strs[0]).split('/');
        if (heirIds.length != collectionHeirarchy.length) {
            throw new Error(`provided collectionHeirarchy length not match with the UID path`);
        }
        const pk: ItemPK = {
            cid: collectionHeirarchy[0],
            pid,
            id: heirIds[0],
        };
        let parentPk = pk;
        for (let i = 1; i < heirIds.length; i++) {
            parentPk.parent = {
                cid: collectionHeirarchy[i],
                id: heirIds[i],
            };
            parentPk = parentPk.parent;
        }
        return pk;
    },
};
