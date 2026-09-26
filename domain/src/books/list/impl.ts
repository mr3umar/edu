import { GetItems, GetLinkedItems, notEmpty } from '@dija/taj-data-services';
import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import {  DATA_SCHEMA, UID_SCHEMA } from '../../config.js';
import { Def, serviceName } from './def.js';
import { BookE, mapBook } from '../../entities/index.js';
import { Context } from '../../context.js';

export const createService = (
    context: {
            getUserId: Context.GetUserId
        },
    depends: {
        tajData: {
            getItems: Service<GetItems>;
            getLinkedItems: Service<GetLinkedItems>;
        };
    },
) =>
    createBaseService<Def>(serviceName, ["userUid"], async (params, scope, errorout, warn) => {
        
             
                // let id: string | undefined;
        
                // const sort = params.query?.sort ?? 'DESC'
        
                // if(params.query?.offset){
                //     const pk = UID_SCHEMA.books.parse(params.query.offset)
                //     id = pk.id
                // }
                // else{

                // }
                
                // const getRes = await depends.tajData.getItems(
                //     {
                //         fromPK: {
                //             cid: DATA_SCHEMA.collections.books,
                //             id
                //         },
                //         sort, 
                //         limit: params.query?.limit
                //     },
                //     scope,
                // );

                const linksRes = await depends.tajData.getLinkedItems({
                    pk: UID_SCHEMA.users.parse(params.userUid),
                    linkId: DATA_SCHEMA.links.user_book,
                    point: 'a'
                }, scope)
        
                const items = linksRes.data.links.map(l => l.item as unknown as BookE).filter(notEmpty)
        
                return {
                    items: items.map(mapBook),
                    next: linksRes.data.nextKey
                };
    });
