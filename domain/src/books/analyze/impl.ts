import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { Context } from '../../context.js';
import { Def, serviceName } from './def.js';
import { GetBookText } from '../../book-text/index.js';
import { CreateSection, createSection } from '../../sections/index.js';
import { UpdatePage } from '../../pages/index.js';
import { PageId } from '../../entities/Page.js';
import { UpdateBook } from '../update/index.js';

export const createService = (
    context: {
        getUserId: Context.GetUserId
        generateBookStructure: Context.generateBookStructure
    },
    depends: {
        getBookText: Service<GetBookText>;
        createSection: Service<CreateSection>;
        updateBook: Service<UpdateBook>;
        updatePage: Service<UpdatePage>;
        tajData: {
            getLinkedItems: Service<GetLinkedItems>;
            getLinks: Service<GetLinks>;
            createItem: Service<CreateItem>;
            link: Service<Link>;
        };
    },
) =>
    createBaseService<Def>(serviceName, [], async (params, scope, errorout, warn) => {

        const bookText = (await depends.getBookText({
            uid: params.uid
        }, scope)).data.item

        // console.log(">>>> ",JSON.stringify(bookText.pages.map(p => p.text)))

        const structure = await context.generateBookStructure(scope, bookText.pages.map(p => p.text))

        if(structure.language || structure.bookTitle) {
            await depends.updateBook({
                uid: params.uid,
                title: structure.bookTitle,
                language: structure.language,
            }, scope)
        }

        // console.log(sectionNumbers, ">>>> sections")

        Promise.all(structure.sections.map(async (section, index) => {
            await depends.createSection({
                bookUid: params.uid,
                sectionIndex: index,
                title: section.title,
            }, scope)
        }))
        Promise.all(structure.pages.map(async (page) => {
            if(page.sectionIndex !== undefined) {
                await depends.updatePage({
                    uid: PageId.toUid(params.uid, page.pageIndex),
                    sectionId: String(page.sectionIndex),
                }, scope)

                // console.log(`${page.pageIndex} --> ${sectionIndex}`)
            }
            else {
                console.warn(`No section for page: ${page.pageIndex}, bookUid: ${params.uid}`)
            }
        }))

        return {
            success: true
        }
    });
