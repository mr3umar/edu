import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { CreateItem, GetLinkedItems, GetLinks, Link } from '@dija/taj-data-services';
import { LocaleCode, ToWords } from 'to-words';
import { Context } from '../../context.js';
import { PreTTSInput, PreTTSOutput, TextStepInput } from '../../entities/Task.js';
import { removeTashkeel, simplifyTashkeel, toLocale } from '../../functions/others.js';
import { CreateTask } from '../create/index.js';
import { GetTask } from '../get/index.js';
import { StartTask } from '../start/index.js';
import { Def, serviceName } from './def.js';
import { findTaskPath } from '../../functions/find-task-path.js';

export const createService = (
        context: {
                getClientLanguage: Context.getClientLanguage
        },
        depends: {
                tajData: {
                        getLinks: Service<GetLinks>;
                        getLinkedItems: Service<GetLinkedItems>;
                        createItem: Service<CreateItem>;
                        link: Service<Link>;
                };
                getTask: Service<GetTask>;
                createTask: Service<CreateTask>;
                startTask: Service<StartTask>;
        },
) =>
        createBaseService<Def>(serviceName, ["taskUid"], async (params, scope, errorout, warn) => {

                
                const {task, taskGroup} = (await depends.getTask({ uid: params.taskUid, include: ["taskGroup"] }, scope)).data
        
                const paths = findTaskPath(task, taskGroup?.tasks!)
                const textStepTask = paths.flat().find(t => t.type == "step-processing")
                const textStepInput = textStepTask?.input as TextStepInput
                
                const input = task.input as PreTTSInput
                
                let localeCode = toLocale(textStepInput.language) as LocaleCode

                const currentUserLanguage = await context.getClientLanguage(scope)
                if (!localeCode && currentUserLanguage) {
                        localeCode = toLocale(currentUserLanguage) as LocaleCode
                }

                let text = input.text;

                text = text.replace(/<[^>]*>/g, ''); // should be after prepareForTTS task to make task reads MathML

                let cc = text
                cc = removeTashkeel(cc)

                if (localeCode) {
                        const toWords = new ToWords({
                                localeCode
                        });
                        const toWordsSA = new ToWords({
                                localeCode: 'ar-SA'
                        });

                        text = text.replace(/[٠-٩]+(?:[.,٫،][٠-٩]+)?/g, (match) => {
                                // Convert Arabic-Indic digits to Western digits
                                const number = match
                                        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                                        .replace(/[.,٫،]/g, '.');

                                const res = toWordsSA.convert(Number(number));

                                console.log(`[toWords] [ar-SA] ${number} -> ${res} `);

                                return res;
                        });
                        text = text.replace(/[0-9٠-٩]+(?:[.,٫][0-9٠-٩]+)?/g, (match) => {
                                // Convert Arabic-Indic digits to Western digits
                                const number = match
                                        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                                        .replace('٫', '.');

                                const res = toWords.convert(Number(number));

                                console.log(`[toWords] [${localeCode}] ${number} -> ${res} `);

                                return res;
                        });
                        text = simplifyTashkeel(text)
                        // fs.appendFileSync(`./initOpenAILiveText-3.txt`, raw + (input.stepIndex === 0 ? '\n---------\n' : '\n'), 'utf-8')
                }

                const output: PreTTSOutput = {
                        text,
                        cc,                        
                }
                return {
                        output
                };
        });
