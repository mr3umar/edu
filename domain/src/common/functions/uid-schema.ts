import { ItemPK } from '@dija/taj-data-services';
import * as uuid from 'uuid';
import { embeddedUuidV7 } from './embedded-uuid-v7.js';
import { extractTimestampFromUUIDv7 } from './extract-v7-timestamp.js';

const cryptoSupported = 
    typeof crypto === 'object' &&
    typeof crypto.getRandomValues === 'function'

const DEFAULT_PARITION_DELIMITER = ':';
type Options = {
    mode?: 'uuid-v7';
    partitioning?: {
        delimiter?: string;
        granularity?: 'year' | 'month' | 'day' | 'hour'; // default: month
        customFormat?: (id: string, time: Date) => string;
    };
    childKey?: string;
};

function toUid(collectionHeirarchy: string[], pk: ItemPK, pid?: string, options?: Options): string {
    const parentUid = pk.parent ? toUid(collectionHeirarchy, pk.parent, undefined, options) : undefined;
    // return `${pid && pid !== '0' && !(options?.mode == "uuid-v7" && collectionHeirarchy.length == 1) ? `${pid}${options?.partitioning?.delimiter ?? DEFAULT_PARITION_DELIMITER}` : ''}${parentUid ? `${parentUid}/` : ''}${pk.id}`;
    return `${pid && pid !== '0' && !(options?.partitioning?.granularity && collectionHeirarchy.length == 1) ? `${pid}${options?.partitioning?.delimiter ?? DEFAULT_PARITION_DELIMITER}` : ''}${parentUid ? `${parentUid}/` : ''}${pk.id}`;
}

// function timestampToPid(id: string, date: Date) {
//     const yymm = `${String(date.getFullYear()).substring(2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
//     return yymm;
// }

export const createUidSchema = (collectionHeirarchy: string[], options?: Options) => {
    const granularity = options?.partitioning?.granularity ?? 'month';
    function timestampToPid(id: string, date: Date) {
        const year = String(date.getFullYear());
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        switch (granularity) {
            case 'year':
                return `${year}${month}`;
            case 'month':
                return `${year}${month}`;
            case 'day':
                return `${year}${month}${day}`;
            case 'hour':
                return `${year}${month}${day}${hour}`;
        }

        return '';
    }
    return {
        toUid: (pk: ItemPK) => {
            return toUid(collectionHeirarchy, pk, pk.pid, options);
        },
        parse: (uid: string) => {
            let pid: string | undefined;
            let heirIds: string[];
            // if (options?.mode == 'uuid-v7' && collectionHeirarchy.length == 1) {
            if (options?.partitioning?.granularity && collectionHeirarchy.length == 1) {
                heirIds = uid.split('/');
                const timestamp = extractTimestampFromUUIDv7(heirIds[0]);
                if(options.partitioning)
                        pid = (options?.partitioning?.customFormat ?? timestampToPid)(heirIds[0], timestamp);
            } else {
                const partitionDelOffset = uid.search(options?.partitioning?.delimiter ?? DEFAULT_PARITION_DELIMITER);
                if (partitionDelOffset !== -1) {
                    pid = uid.substring(0, partitionDelOffset);
                    heirIds = uid.substring(partitionDelOffset + 1).split('/');
                } else {
                    heirIds = uid.split('/');
                }
            }
            if (heirIds.length != collectionHeirarchy.length) {
                throw new Error(`provided collectionHeirarchy length not match with the UID path`);
            }
            heirIds.reverse()
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
        generate: (parent?: ItemPK, opts?: {msecs?: number}) => {
            let uid: string;
            let id: string;
            let pid = parent?.pid;
            if (options?.mode == "uuid-v7") {
                console.log(`[uuid function] ${cryptoSupported ? 'crypto' : 'embedded'}`)
                id = cryptoSupported ? uuid.v7({ msecs: opts?.msecs }) : embeddedUuidV7(opts?.msecs);
                uid = id;
                if(options?.partitioning && !parent){
                        const timestamp = opts?.msecs ? new Date(opts.msecs) : extractTimestampFromUUIDv7(id);
                        pid = (options?.partitioning?.customFormat ?? timestampToPid)(id, timestamp);
                }
            } else {
                throw new Error(`options.mode is undefined`);
            }
            const pk = {
                cid: collectionHeirarchy[0],
                pid,
                id,
                parent,
                childKey: options.childKey,
            }
            return {
                pk,
                uid: toUid(collectionHeirarchy, pk, pk.pid, options),
                id
            };
        },
    };
};
