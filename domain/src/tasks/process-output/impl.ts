// import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
// import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
// import he from "he";
// import { Context } from '../../../context.js';
// import { StepChunkInput } from '../../../entities/Task.js';
// import { getOrCreateAbortController } from '../../../functions/abort.js';
// import { hasLettersOrNumbers } from '../../../functions/others.js';
// import { BoardContentType } from '../../../server/types.js';
// import { CreateTask } from '../../create/index.js';
// import { GetTask } from '../../get/index.js';
// import { StartTask } from '../../start/index.js';
// import { PreTTS } from '../pre-tts/index.js';
// import { Def, serviceName } from './def.js';

// const wordRegexWithPrefixAndXmlTag = /(?:\[word\s*|<word\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/word\]|<\/word>|\[\/word>|<\/word\])/g;
// const labelRegexWithPrefixAndXmlTag = /(?:\[label\s*|<label\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/label\]|<\/label>|\[\/label>|<\/label\])/g;
// const optionRegexWithPrefixAndXmlTag = /(?:^|\s)?(?:\d+[\.\-)]?|[•*+\-])?\s*(?:\[option\s*|<option\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/option\]|<\/option>|\[\/option>|<\/option\])/g;
// const attrRegex = /(\w+)=(?:\\)?"([^"]+)"/g;


// export const createService = (
//     context: {
//         getClientLanguage: Context.getClientLanguage
//     },
//     depends: {
//         tajData: {
//             getLinks: Service<GetLinks>;
//             getLinkedItems: Service<GetLinkedItems>;
//             createItem: Service<CreateItem>;
//             link: Service<Link>;
//         };
//         getTask: Service<GetTask>;
//         createTask: Service<CreateTask>;
//         startTask: Service<StartTask>;
//         preTTS: Service<PreTTS>;
//     },
// ) =>
//     createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {
        
//         const task = (await depends.getTask({uid: params.taskUid}, scope)).data.task

//         const input = task.input as StepChunkInput
//         let htmlForBoard = input.boardContent?.richHtmlWithSVGAndMathML

//         const abortSignal = getOrCreateAbortController(task.taskGroupUid).signal

//         const options: string[] = []

//         const wordsIds: string[] = []
//         {
//         // let raw = textToSpeak.replace(
//         //   tagRegex,
//         //   (_, idVal, xVal, yVal, wVal, hVal, wordText) => {

//         //     wordsIds.push(idVal)

//         //     return wordText
//         //   }
//         // );
//         // raw = raw.replace(
//         //   tagRegex2,
//         //   (_, idVal, wordText) => {

//         //     wordsIds.push(idVal)

//         //     return wordText
//         //   }
//         // );
//         // if(wordsIds.length > 0) {

//         //   wsClient.send(JSON.stringify({
//         //           event: 'showLaser',
//         //           wordsIds,
//         //   }));
//         // }
//         }
//         {
//         // if (options.length > 0) {

//         //   wsClient.send(JSON.stringify({
//         //     event: 'showOptions',
//         //     options: options.map(opt => ({ content: opt }))
//         //   }));
//         // }

//         // lineToSay = lineToSay.replace(/<[^>]*>/g, '');
//         }
//         const lineToSay = he.decode(input.textToSay);
        
//         let raw = lineToSay.replace(
//                 wordRegexWithPrefixAndXmlTag,
//                 (_, attrs, wordText) => {
//                         const attributes: Record<string, string> = {};

//                         let match;
//                         while ((match = attrRegex.exec(attrs)) !== null) {
//                                 attributes[match[1]] = match[2];
//                         }

//                         if (attributes.id) {
//                                 wordsIds.push(attributes.id);
//                         }

//                         return wordText;
//                 }
//         );
//         raw = raw.replace(
//                 labelRegexWithPrefixAndXmlTag,
//                 (_, attrs, wordText) => {
//                         return wordText;
//                 }
//         );


//         raw = raw.replace(
//                 optionRegexWithPrefixAndXmlTag,
//                 (_, attrs, text) => {
//                         // const attributes: Record<string, string> = {};

//                         // let match;
//                         // while ((match = attrRegex.exec(attrs)) !== null) {
//                         //   attributes[match[1]] = match[2];
//                         // }

//                         // if (attributes.id) {

//                         text = he.decode(text);
//                         options.push(text);
//                         // }

//                         return '';
//                 }
//         );

//         if (htmlForBoard) {

//                 const optionsIsEmpty = options.length == 0
//                 htmlForBoard = htmlForBoard.replace(
//                         wordRegexWithPrefixAndXmlTag,
//                         (_, attrs, wordText) => {

//                                 return wordText;
//                         }
//                 );
//                 htmlForBoard = htmlForBoard.replace(
//                         labelRegexWithPrefixAndXmlTag,
//                         (_, attrs, wordText) => {

//                                 return wordText;
//                         }
//                 );
//                 htmlForBoard = htmlForBoard.replace(
//                         optionRegexWithPrefixAndXmlTag,
//                         (_, attrs, text) => {
//                                 // const attributes: Record<string, string> = {};

//                                 // let match;
//                                 // while ((match = attrRegex.exec(attrs)) !== null) {
//                                 //   attributes[match[1]] = match[2];
//                                 // }

//                                 // if (attributes.id) {
//                                 // }

//                                 if (optionsIsEmpty) {
//                                         text = he.decode(text);
//                                         options.push(text);
//                                 }

//                                 return '';
//                         }
//                 );
//         }
//         console.log(`wordsIds: ${wordsIds}, raw: ${raw}\n=======\n`)

//         if (!hasLettersOrNumbers(raw)) {
//                 return {
//                         output: {}
//                 }
//         }

//         if (raw) {

//                 let boardData: {type: BoardContentType, content: any} | undefined
//                 if(htmlForBoard && htmlForBoard?.length > 0) {

//                         boardData = {
//                                 type: 'general',
//                                 content: {
//                                         html: htmlForBoard
//                                 }
//                         } 
//                 }
//                 else {
//                         htmlForBoard = undefined
//                 }

//         }

//         return {
//                 output: {
//                 },
//         };
//     });
