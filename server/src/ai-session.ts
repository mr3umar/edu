import he from "he"
import { WebSocket } from 'ws'
import { prepareForTTS } from "./prepareForTTS-openai.js"
import { PROMPT_NORMALIZE_TEXT } from "./prompts/normalize-text.js"
import { initGeminiLiveText } from "./text-gemini1.js"
import { BoardContentType, initOpenAILiveLines } from "./text-openai-lines.js"
import { hasLettersOrNumbers, initOpenAILiveText } from "./text-openai.js"
import { initGrokTTS } from "./tts-grok.js"
import { LineStreamQueue } from "./stream-splitter.js"
import * as fs from 'fs'; // 📁 Native File System integration
import { TextDelegate, TutorialJob, VoiceDelegate } from "./types.js"
import { generateContextualTutorial } from "./tutorial-service.js"
import { streamAudioToOpenAI } from "./stt-openai.js"
import { SERVICES } from "./index-new.js"
import { SCOPE } from "./config.js"
import { BookM, PageAnalysisM } from "edu-ai-domain"
import * as path from 'path';
import { fileURLToPath } from "url"
import { Deferred } from "./deferred.js"
import { LocaleCode, ToWords } from 'to-words';
import { generateLongDiv } from "./board-content-agents/long-div-openai.js"
import { generateLongMultiply } from "./board-content-agents/long-multiply-openai.js"
import { generateLongDiv2 } from "./board-content-agents/long-div-openai-2.js"
import { beautifyHtml } from "./board-content-agents/beautify-html-gemini.js"
import { beautifyHtmlQwen } from "./board-content-agents/beautify-html-qwen.js"
import { beautifyHtmlClaude } from "./board-content-agents/beautify-html-claude.js"
import { validateBoardContent } from "./board-content-agents/validate-board-openai.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createAiSession = async (wsClient: WebSocket) => {

        let currentPageIndex = 0
        let currentUserLanguage: string | undefined = undefined
        let currentStepId: string | undefined = undefined

        let loadedPages: {
                [key: string]: {
                        analysis?: PageAnalysisM
                        analysisDef?: Deferred<PageAnalysisM>
                        analysisLock?: boolean;
                        analysisNotFoundSince?: string
                }
        } = {}


        const tutorialQueueJobs: TutorialJob[] = []


        // const chirp = await streamAudioToChirp()
        // const chirp = await streamAudioToOpenAILive({
        let chirpMessages: string[] = []
        let chirpProcessTO: any = undefined
        const chirp = await streamAudioToOpenAI({
                // const chirp = await streamAudioToGrok({
                onMessage: async (msg) => {

                        if (!hasLettersOrNumbers(msg.data.content)) {
                                return
                        }
                        
                        chirpMessages.push(msg.data.content)
                        
                        // console.log(msg.data, "^^^^^")
                        // if(!msg.data.lastChunk) {
                        //         return
                        // }


                        const processMessage = () => {
                                const message = chirpMessages.join(" ")
                                chirpMessages = []
        
                                console.log(`Sending to textStream: ${message}`)
                                wsClient.send(
                                        JSON.stringify({
                                                event: "ai-agent-status",
                                                status: 'thinking',
                                        })
                                );
        
                                // // console.log(msg)
                                textStream.write(`stt-output`, message)
        
                                // const book = await getBook(DEMO_BOOK_ID.value, { schema: false })
                                let instructions = undefined
                                if (currentUserLanguage == "ar")
                                  instructions = `عندما يكون المطلوب شرح استخدم writeOnBoard tool لكتابة ورسم محتوى منسق بشكل جميل`
                                else
                                  instructions = `When it is requirment to explain, use writeOnBoard tool to visualize with rich html/svg content`
        
                                if(currentStepId) {
                                        instructions += `\n current user stepId: ${currentStepId}`
                                }
                                // textStream.write(message)
                                textStream.send(instructions)
        
                                // textAi.sendMessage(message, 'user')
                                // llm.sendMessage(message, 'user')
                        }
                        // clearTimeout(chirpProcessTO)
                        // chirpProcessTO = setTimeout(() => {
                                processMessage()
                        // }, 2000)

                },
                onDelta: delta => {

                        // if (!hasLettersOrNumbers(delta)) {
                        //         return
                        // }
                        // console.log(`###6 status: listening`)
                        // wsClient.send(
                        //         JSON.stringify({
                        //                 event: "ai-agent-status",
                        //                 status: 'listening',
                        //         })
                        // );
                }
        })

        let totalCost = 0

        const recordUsage: TextDelegate["recordUsage"] = async (cost, usage) => {
                if (usage.type == 'tokens') {
                        console.log(usage.info)
                }

                totalCost += cost
        }

        const tagRegex1 = /\[word\s+id="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"\](.*?)\[\/word\]/g;
        const tagRegex2 = /\[word\s+id="([^"]+)"\s\](.*?)\[\/word\]/g;

        // const tagRegex = /\[word\s+([^\]]+)\](.*?)\[\/word\]/g;
        const tagRegex = /\[word\s+([^\]]+)\]([\s\S]*?)\[\/word\]/g;
        const labelTagRegex = /\[label\s+([^\]]+)\]([\s\S]*?)\[\/label\]/g;
        const tagOptionRegex = /\[option\s*([^\]]*)\]([\s\S]*?)\[\/option\]/g;
        // const optionRegexWithPrefix = /(?:^|\s)?(?:\d+[\.\-)]?|[•*+\-])?\s*\[option\s*([^\]]*)\]([\s\S]*?)\[\/option\]/g;
        const wordRegexWithPrefixAndXmlTag = /(?:\[word\s*|<word\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/word\]|<\/word>|\[\/word>|<\/word\])/g;
        const optionRegexWithPrefixAndXmlTag = /(?:^|\s)?(?:\d+[\.\-)]?|[•*+\-])?\s*(?:\[option\s*|<option\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/option\]|<\/option>|\[\/option>|<\/option\])/g;
        const attrRegex = /(\w+)=(?:\\)?"([^"]+)"/g;

        let options: string[] = []


        const delegate: VoiceDelegate = {
                getPageContent: async (pageNumber) => {

                        // const page = book.pages.find(p => p.pageNumber == pageNumber)
                        // if(!page) {
                        //     return { error: "Page not found" };
                        // }
                        // const section = page.sectionId ? book.sections.find(s => s.id == page.sectionId) : undefined
                        // const relatedPages = section ? book.pages.filter(p => p.sectionId == page.sectionId && p.pageNumber != page.pageNumber) : []

                        // console.log(`Page Content to voice provider: page: ${JSON.stringify(page)}, ${page}, relatedPages: ${relatedPages.map((p: any) => p.pageNumber)}. section: ${JSON.stringify(section)}`)

                        // return { 
                        //   page, 
                        //   relatedPages, 
                        //   section: {
                        //     ...section, tutorials: [{id: '001', steps: tutorial1.steps}]
                        //   } 
                        // }
                        return ""
                },
                getTutorialJob: (tutorialId) => {

                        return tutorialQueueJobs.find(j => j.tutorialId == tutorialId)
                },
                updateTutorialJobStatus: (tutorialId, status) => {

                        const job = delegate.getTutorialJob(tutorialId)
                        if (job) {
                                job.status = status
                        }
                },
                startTutorial: async (tutorialId, tutorialDesc) => {
                        if (wsClient.readyState === WebSocket.OPEN) {

                                const existingTask = tutorialQueueJobs.find(j => j.tutorialId == tutorialId)

                                if (existingTask?.status == 'running') {

                                        throw new Error("JOB_ALREADY_RUNNING")
                                }
                                if (existingTask) {
                                        existingTask.status = 'running'
                                }
                                else {
                                        tutorialQueueJobs.push({
                                                tutorialId,
                                                status: 'running'
                                        })
                                }

                                const resp = await generateContextualTutorial(tutorialId, `${tutorialDesc}. user language is Arabic and RTL reading direction. Make it simple as much as possible.`);

                                console.log(`🎨 [Sub-Agent Completed] Vector compiled for ID "${tutorialId}"`);

                                // Transmit the final SVG asset payload down to your React client
                                if (wsClient.readyState === WebSocket.OPEN) {
                                        wsClient.send(JSON.stringify({
                                                event: 'startTutorial',
                                                data: resp
                                        }));
                                }

                                return resp
                        }
                },
                startTutorialFromTextBook: async (bookId, tutorialId, tutorialDesc, partId) => {
                        if (wsClient.readyState === WebSocket.OPEN) {

                                const existingTask = tutorialQueueJobs.find(j => j.tutorialId == tutorialId)

                                if (existingTask?.status == 'running') {

                                        throw new Error("JOB_ALREADY_RUNNING")
                                }
                                if (existingTask) {
                                        existingTask.status = 'running'
                                }
                                else {
                                        tutorialQueueJobs.push({
                                                tutorialId,
                                                status: 'running'
                                        })
                                }

                                // const book = await getBook(bookId, { schema: true })
                                // const page = book.pages.find(p => p.pageNumber == CURRENT_PAGE_NUMBER.value)
                                // const parts = page.parts;
                                // const qPartId = getQuestionParentId(partId, parts)
                                // const relatedParts = qPartId ? getPartWithNestedChildren(qPartId, parts) : []
                                // console.log(tutorialId, `Generate tutorial step by step for this content. Use this json which is generated from textbook page, understand the spatial logic using attribute coordinates: ${JSON.stringify(relatedParts)}`);
                                // void generateContextualSVG(call.args.drawingId, call.args.drawingDesc)
                                // .then(res => {
                                //         wsClient.send(JSON.stringify({
                                //                 event: 'drawOnBoard',
                                //                 data: res // Pass the raw SVG layout string
                                //         }));
                                // })
                                // .catch(err => {
                                //         console.log(`cannot call generateContextualSVG. Error: ${err.message}`)
                                // })

                                // ; (async () => {
                                // try {
                                // Forward the ID and description to your context-aware gemini-2.5-pro instance
                                const resp = await generateContextualTutorial(tutorialId, `${tutorialDesc}. user language is Arabic and RTL reading direction. Make it simple as much as possible.`);
                                // const resp = await generateOpenAITutorial(tutorialId, `${tutorialDesc}. user language is Arabic and RTL reading direction. Make it simple as much as possible.`);
                                // const resp = JSON.parse("{\"title\":\"شرح القسمة المطولة\",\"steps\":[{\"stepNumber\":1,\"textToSay\":\"أولاً، دعنا نجهز مسألة القسمة. نكتب العدد الذي نريد قسمته، وهو 68، داخل رمز القسمة، والعدد الذي نقسم عليه، وهو 2، في الخارج.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 80 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">68</text></svg>\"},{\"stepNumber\":2,\"textToSay\":\"نبدأ بالرقم الأول من اليسار في العدد 68، وهو 6. نسأل: كم مرة يمكن للعدد 2 أن يدخل في العدد 6؟ الجواب هو 3 مرات. نكتب 3 في الأعلى.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:red;font-weight:bold;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 80 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"57\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">6</text><text x=\\\"73\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">8</text><text x=\\\"57\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">3</text></svg>\"},{\"stepNumber\":3,\"textToSay\":\"الآن، نضرب الرقم الذي حصلنا عليه، وهو 3، في المقسوم عليه، وهو 2. حاصل الضرب هو 6. نكتب هذا الناتج تحت الرقم 6.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:red;font-weight:bold;}.small{font-size:10px;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 80 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">68</text><text x=\\\"57\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\">3</text><text x=\\\"57\\\" y=\\\"75\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">6</text><text x=\\\"15\\\" y=\\\"30\\\" text-anchor=\\\"middle\\\" class=\\\"small\\\">3 x 2 = 6</text></svg>\"},{\"stepNumber\":4,\"textToSay\":\"بعد ذلك، نطرح 6 من 6. الباقي هو 0. نكتب الصفر في الأسفل.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:red;font-weight:bold;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 80 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">68</text><text x=\\\"57\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\">3</text><text x=\\\"57\\\" y=\\\"75\\\" text-anchor=\\\"middle\\\">-6</text><line x1=\\\"50\\\" y1=\\\"80\\\" x2=\\\"65\\\" y2=\\\"80\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"57\\\" y=\\\"95\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">0</text></svg>\"},{\"stepNumber\":5,\"textToSay\":\"الآن، ننزل الرقم التالي من العدد 68، وهو 8. نضعه بجانب الصفر.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:red;font-weight:bold;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 80 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">6<tspan class=\\\"highlight\\\">8</tspan></text><text x=\\\"57\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\">3</text><text x=\\\"57\\\" y=\\\"75\\\" text-anchor=\\\"middle\\\">-6</text><line x1=\\\"50\\\" y1=\\\"80\\\" x2=\\\"65\\\" y2=\\\"80\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"95\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">8</text><text x=\\\"57\\\" y=\\\"95\\\" text-anchor=\\\"middle\\\">0</text><path d=\\\"M 73 60 L 73 85\\\" fill=\\\"none\\\" stroke=\\\"red\\\" stroke-width=\\\"1.5\\\" marker-end=\\\"url(#arrow)\\\"/><defs><marker id=\\\"arrow\\\" viewBox=\\\"0 0 10 10\\\" refX=\\\"5\\\" refY=\\\"5\\\" markerWidth=\\\"3\\\" markerHeight=\\\"3\\\" orient=\\\"auto-start-reverse\\\"><path d=\\\"M 0 0 L 10 5 L 0 10 z\\\" fill=\\\"red\\\" /></marker></defs></svg>\"},{\"stepNumber\":6,\"textToSay\":\"نكرر العملية. نسأل: كم مرة يمكن للعدد 2 أن يدخل في العدد 8؟ الجواب هو 4 مرات. نكتب الـ 4 في الأعلى بجانب الـ 3.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:red;font-weight:bold;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 80 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">68</text><text x=\\\"57\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\">3</text><text x=\\\"73\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">4</text><text x=\\\"57\\\" y=\\\"75\\\" text-anchor=\\\"middle\\\">-6</text><line x1=\\\"50\\\" y1=\\\"80\\\" x2=\\\"65\\\" y2=\\\"80\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"95\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">8</text><text x=\\\"57\\\" y=\\\"95\\\" text-anchor=\\\"middle\\\">0</text></svg>\"},{\"stepNumber\":7,\"textToSay\":\"مرة أخرى، نضرب الرقم الجديد، وهو 4، في المقسوم عليه، وهو 2. حاصل الضرب هو 8. نكتبه تحت الـ 8 التي أنزلناها.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:red;font-weight:bold;}.small{font-size:10px;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 110 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">68</text><text x=\\\"65\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\">34</text><text x=\\\"57\\\" y=\\\"75\\\" text-anchor=\\\"middle\\\">-6</text><line x1=\\\"50\\\" y1=\\\"80\\\" x2=\\\"65\\\" y2=\\\"80\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"95\\\" text-anchor=\\\"middle\\\">8</text><text x=\\\"65\\\" y=\\\"115\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">8</text><text x=\\\"15\\\" y=\\\"30\\\" text-anchor=\\\"middle\\\" class=\\\"small\\\">4 x 2 = 8</text></svg>\"},{\"stepNumber\":8,\"textToSay\":\"أخيرًا، نطرح 8 من 8. الباقي هو 0. بما أنه لا توجد أرقام أخرى لننزلها والباقي هو صفر، فقد انتهت عملية القسمة.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:red;font-weight:bold;}</style><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 110 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">68</text><text x=\\\"65\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\">34</text><text x=\\\"57\\\" y=\\\"75\\\" text-anchor=\\\"middle\\\">-6</text><line x1=\\\"50\\\" y1=\\\"80\\\" x2=\\\"65\\\" y2=\\\"80\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"95\\\" text-anchor=\\\"middle\\\">8</text><text x=\\\"65\\\" y=\\\"115\\\" text-anchor=\\\"middle\\\">-8</text><line x1=\\\"58\\\" y1=\\\"120\\\" x2=\\\"73\\\" y2=\\\"120\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"135\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">0</text></svg>\"},{\"stepNumber\":9,\"textToSay\":\"الجواب هو الرقم الموجود في الأعلى. إذن، 68 مقسومًا على 2 يساوي 34.\",\"svgCode\":\"<svg viewBox=\\\"0 0 100 100\\\" width=\\\"100%\\\" height=\\\"100%\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><style>text{font-family:sans-serif;font-size:16px;fill:#333;}.highlight{fill:blue;font-weight:bold;}</style><rect x=\\\"50\\\" y=\\\"0\\\" width=\\\"30\\\" height=\\\"22\\\" fill=\\\"rgba(0,0,255,0.1)\\\" stroke=\\\"blue\\\" stroke-width=\\\"1.5\\\" rx=\\\"5\\\"/><text x=\\\"30\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">2</text><path d=\\\"M 40 20 L 40 80 L 80 20\\\" fill=\\\"none\\\" stroke=\\\"#333\\\" stroke-width=\\\"2\\\"/><text x=\\\"65\\\" y=\\\"55\\\" text-anchor=\\\"middle\\\">68</text><text x=\\\"65\\\" y=\\\"18\\\" text-anchor=\\\"middle\\\" class=\\\"highlight\\\">34</text></svg>\"}]}")

                                // for(const s of resp.steps) {
                                //   s.svgCode = s.svgCode.replace('viewBox', 'viewBoxIgnore')
                                // }

                                console.log(`🎨 [Sub-Agent Completed] Vector compiled for ID "${tutorialId}"`);

                                // Transmit the final SVG asset payload down to your React client
                                if (wsClient.readyState === WebSocket.OPEN) {
                                        wsClient.send(JSON.stringify({
                                                event: 'startTutorial',
                                                data: resp
                                        }));
                                }

                                return resp
                                // } catch (svgErr) {
                                //   console.error(`❌ Sub-agent layout composition crashed for ID "${tutorialId}":`, svgErr);
                                // }
                                // })(); // Self-invoking async context

                                // }
                                // functionResponses.push({
                                //         response: { output: { rendered: true } },
                                //         name,
                                //         id: id
                                //       });

                        }
                },
                showTutorialStep: (tutorialId, stepNumber) => {
                        if (wsClient.readyState === WebSocket.OPEN) {


                                if (wsClient.readyState === WebSocket.OPEN) {
                                        wsClient.send(JSON.stringify({
                                                event: 'showTutorialStep',
                                                tutorialId, stepNumber
                                        }));
                                }

                        }
                },
                showLaser: (wordsIds) => {

                        if (wsClient.readyState === WebSocket.OPEN) {

                                console.log("show Laser", wordsIds);
                                // wsClient.send(JSON.stringify({
                                //         event: 'showLaser',
                                //         wordsIds,
                                // }));
                        }
                },
                goToPage: (pageNumber) => {

                        if (wsClient.readyState === WebSocket.OPEN) {

                                wsClient.send(JSON.stringify({
                                        event: 'goToPage',
                                        pageNumber,
                                }));
                        }
                },
                updateAssessmentScore: (conceptId, score) => {

                        console.log(`Update assessment ${conceptId}: ${score}`)
                },
                writeOnBook: (svgCode) => {
                        if (wsClient.readyState === WebSocket.OPEN) {
                                wsClient.send(JSON.stringify({
                                        event: 'writeOnBook',
                                        data: svgCode // Pass the raw SVG layout string
                                }));
                        }
                },
                writeOnBoard: (html) => {
                        if (wsClient.readyState === WebSocket.OPEN) {

                                html = html.replace(/\[word(?:\s+([^\]]*))?\]/g, '');
                                html = html.replace(/\[\/word\]/g, '');
                                html = html.replace(/\[label(?:\s+([^\]]*))?\]/g, '');
                                html = html.replace(/\[\/label\]/g, '');

                                let options: string[] = []

                                html = html.replace(
                                        tagOptionRegex,
                                        (_, attrs, text) => {
                                                // const attributes: Record<string, string> = {};

                                                // let match;
                                                // while ((match = attrRegex.exec(attrs)) !== null) {
                                                //   attributes[match[1]] = match[2];
                                                // }

                                                // if (attributes.id) {
                                                options.push(text);
                                                // }

                                                return text;
                                        }
                                );

                                html = html.replace(/\[option(?:\s+([^\]]*))?\]/g, '');
                                html = html.replace(/\[\/option\]/g, '');

                                wsClient.send(JSON.stringify({
                                        event: 'writeOnBoard',
                                        data: html // Pass the raw SVG layout string
                                }));

                                if (options.length > 0) {

                                        wsClient.send(JSON.stringify({
                                                event: 'showOptions',
                                                options: options.map(opt => ({ content: opt }))
                                        }));
                                }
                        }
                },
                openTutorial: (tutorialId) => {
                        if (wsClient.readyState === WebSocket.OPEN) {
                                wsClient.send(JSON.stringify({
                                        event: 'openTutorial',
                                        tutorialId
                                }));
                        }
                },
                changeTutorialStep: (tutorialId, stepNumber) => {
                        if (wsClient.readyState === WebSocket.OPEN) {
                                wsClient.send(JSON.stringify({
                                        event: 'changeTutorialStep',
                                        tutorialId,
                                        stepNumber
                                }));
                        }
                },
                showOptions: (options) => {
                        if (wsClient.readyState === WebSocket.OPEN) {
                                wsClient.send(JSON.stringify({
                                        event: 'showOptions',
                                        options
                                }));
                        }
                },
        }


        const streamQueue1 = new LineStreamQueue(
                async (textToSpeak: string, signal: AbortSignal) => {
                        console.log('tts started')

                        const wordsIds: string[] = []
                        // let raw = textToSpeak.replace(
                        //   tagRegex,
                        //   (_, idVal, xVal, yVal, wVal, hVal, wordText) => {

                        //     wordsIds.push(idVal)

                        //     return wordText
                        //   }
                        // );
                        // raw = raw.replace(
                        //   tagRegex2,
                        //   (_, idVal, wordText) => {

                        //     wordsIds.push(idVal)

                        //     return wordText
                        //   }
                        // );
                        let raw = textToSpeak.replace(
                                tagRegex,
                                (_, attrs, wordText) => {
                                        const attributes: Record<string, string> = {};

                                        let match;
                                        while ((match = attrRegex.exec(attrs)) !== null) {
                                                attributes[match[1]] = match[2];
                                        }

                                        if (attributes.id) {
                                                wordsIds.push(attributes.id);
                                        }

                                        return wordText;
                                }
                        );
                        raw = raw.replace(
                                optionRegexWithPrefixAndXmlTag,
                                (_, attrs, text) => {
                                        // const attributes: Record<string, string> = {};

                                        // let match;
                                        // while ((match = attrRegex.exec(attrs)) !== null) {
                                        //   attributes[match[1]] = match[2];
                                        // }

                                        // if (attributes.id) {
                                        options.push(text);
                                        // }

                                        return '';
                                }
                        );
                        console.log(`wordsIds: ${wordsIds}, row: ${raw}\n=======\n`)
                        // if(wordsIds.length > 0) {

                        //   wsClient.send(JSON.stringify({
                        //           event: 'showLaser',
                        //           wordsIds,
                        //   }));
                        // }
                        if (signal.aborted) {
                                return
                        }
                        // if (options.length > 0) {

                        //   wsClient.send(JSON.stringify({
                        //     event: 'showOptions',
                        //     options: options.map(opt => ({ content: opt }))
                        //   }));
                        // }

                        if (!hasLettersOrNumbers(raw)) {
                                return
                        }

                        const normalized = await prepareForTTS(raw)
                        if (normalized) {


                                // if(writeToFile) {
                                fs.appendFileSync(`./initOpenAILiveText-2.txt`, normalized + '\n', 'utf-8')
                                // }
                                // console.log(normalized, "****")
                                // textStream2.write(raw, true)
                                // textStream2.send()

                                await initGrokTTS(wsClient, normalized, normalized, "", wordsIds, options, undefined, signal, recordUsage)
                                console.log('tts finished')
                        }
                }
        );

        const streamQueue2 = new LineStreamQueue(
                async (textToSpeak: string, signal: AbortSignal) => {
                        console.log('tts started')

                        if (signal.aborted) {
                                return
                        }
                        // await initGeminiTTS(wsClient, raw, wordsIds)
                        // await ttsAI.send(raw, wordsIds, signal)
                        await initGrokTTS(wsClient, textToSpeak, textToSpeak, "", [], options, undefined, signal, recordUsage)
                        console.log('tts finished')
                        // await delayPromise(1000)
                }
        );


        const streamQueueSingle = new LineStreamQueue(
                async (textToSpeak: string, signal: AbortSignal) => {
                        console.log('tts started')

                        const wordsIds: string[] = []
                        // let raw = textToSpeak.replace(
                        //   tagRegex,
                        //   (_, idVal, xVal, yVal, wVal, hVal, wordText) => {

                        //     wordsIds.push(idVal)

                        //     return wordText
                        //   }
                        // );
                        // raw = raw.replace(
                        //   tagRegex2,
                        //   (_, idVal, wordText) => {

                        //     wordsIds.push(idVal)

                        //     return wordText
                        //   }
                        // );
                        let raw = textToSpeak.replace(
                                tagRegex,
                                (_, attrs, wordText) => {
                                        const attributes: Record<string, string> = {};

                                        let match;
                                        while ((match = attrRegex.exec(attrs)) !== null) {
                                                attributes[match[1]] = match[2];
                                        }

                                        if (attributes.id) {
                                                wordsIds.push(attributes.id);
                                        }

                                        return wordText;
                                }
                        );
                        raw = raw.replace(
                                tagOptionRegex,
                                (_, attrs, text) => {
                                        // const attributes: Record<string, string> = {};

                                        // let match;
                                        // while ((match = attrRegex.exec(attrs)) !== null) {
                                        //   attributes[match[1]] = match[2];
                                        // }

                                        // if (attributes.id) {
                                        options.push(text);
                                        // }

                                        return '';
                                }
                        );
                        console.log(`wordsIds: ${wordsIds}, row: ${raw}\n=======\n`)
                        // if(wordsIds.length > 0) {

                        //   wsClient.send(JSON.stringify({
                        //           event: 'showLaser',
                        //           wordsIds,
                        //   }));
                        // }
                        if (signal.aborted) {
                                return
                        }
                        if (options.length > 0) {

                                wsClient.send(JSON.stringify({
                                        event: 'showOptions',
                                        options: options.map(opt => ({ content: opt }))
                                }));
                        }
                        // await initGeminiTTS(wsClient, raw, wordsIds)
                        // await ttsAI.send(raw, wordsIds, signal)
                        await initGrokTTS(wsClient, raw, raw, "", wordsIds, options, undefined, signal, recordUsage)
                        console.log('tts finished')
                        // await delayPromise(1000)
                }
        );

        // const textStream1 = await initGeminiLiveText(bookId, wsClient, {
        //         onMessage: (msg) => {
        //                 streamQueue1.push((msg.data?.content ?? '') + (msg.turnComplete ? '\n' : ''))
        //         },
        //         // onMessage2: (msg) => {
        //         //   streamQueue.push((msg.data?.content ?? '') + (msg.turnComplete ? '\n' : ''))
        //         // }
        //         callTool: async (msg) => {
        //         },
        //         recordUsage,
        // })

        // const textStream1BeforeLines = await initOpenAILiveText(bookId, wsClient, {
        //         onMessage: (msg) => {
        //                 // streamQueueSingle.push((msg.data?.content ?? '') + (msg.turnComplete ? '\n' : ''))
        //                 streamQueue1.push((msg.data?.content ?? '') + (msg.turnComplete ? '\n' : ''))
        //         },
        //         callTool: async (msg) => {

        //                 console.log(`Calling tool`, msg)
        //                 if (msg.name == "writeOnTextbook") {
        //                         delegate.writeOnBook(msg.args.svgCode)
        //                 }
        //                 else if (msg.name == "writeOnBoard") {
        //                         delegate.writeOnBoard(msg.args.html)
        //                 }
        //                 else if (msg.name == "openTutorial") {
        //                         delegate.openTutorial(msg.args.tutorialId)
        //                 }
        //                 else if (msg.name == "changeTutorialStep") {
        //                         delegate.changeTutorialStep(msg.args.tutorialId, msg.args.stepNumber)
        //                 }
        //                 else if (msg.name == "getPageContent") {
        //                         return delegate.getPageContent(msg.args.pageNumber)
        //                 }
        //                 else if (msg.name == "showOptions") {
        //                         delegate.showOptions(msg.args.options)
        //                 }
        //                 return { succeed: true }
        //         },
        //         recordUsage
        // }, undefined, "initOpenAILiveText-1")


        let ttsQueue = Promise.resolve();
        const textStream = await initOpenAILiveLines(undefined, wsClient, {
                onMessage: async (index, stepId, lang, lineToSay, board, abortSignal) => {

                        console.log(`INDEX::`, index)

                        let htmlForBoard = board?.richHtmlWithSVGAndMathML

                        const options: string[] = []

                        const wordsIds: string[] = []
                        // let raw = textToSpeak.replace(
                        //   tagRegex,
                        //   (_, idVal, xVal, yVal, wVal, hVal, wordText) => {

                        //     wordsIds.push(idVal)

                        //     return wordText
                        //   }
                        // );
                        // raw = raw.replace(
                        //   tagRegex2,
                        //   (_, idVal, wordText) => {

                        //     wordsIds.push(idVal)

                        //     return wordText
                        //   }
                        // );
                        // if(wordsIds.length > 0) {

                        //   wsClient.send(JSON.stringify({
                        //           event: 'showLaser',
                        //           wordsIds,
                        //   }));
                        // }
                        if (abortSignal.aborted) {
                                return
                        }
                        // if (options.length > 0) {

                        //   wsClient.send(JSON.stringify({
                        //     event: 'showOptions',
                        //     options: options.map(opt => ({ content: opt }))
                        //   }));
                        // }

                        // lineToSay = lineToSay.replace(/<[^>]*>/g, '');

                        lineToSay = he.decode(lineToSay);
                        
                        let raw = lineToSay.replace(
                                wordRegexWithPrefixAndXmlTag,
                                (_, attrs, wordText) => {
                                        const attributes: Record<string, string> = {};

                                        let match;
                                        while ((match = attrRegex.exec(attrs)) !== null) {
                                                attributes[match[1]] = match[2];
                                        }

                                        if (attributes.id) {
                                                wordsIds.push(attributes.id);
                                        }

                                        return wordText;
                                }
                        );


                        raw = raw.replace(
                                optionRegexWithPrefixAndXmlTag,
                                (_, attrs, text) => {
                                        // const attributes: Record<string, string> = {};

                                        // let match;
                                        // while ((match = attrRegex.exec(attrs)) !== null) {
                                        //   attributes[match[1]] = match[2];
                                        // }

                                        // if (attributes.id) {

                                        text = he.decode(text);
                                        options.push(text);
                                        // }

                                        return '';
                                }
                        );

                        if (htmlForBoard) {

                                const optionsIsEmpty = options.length == 0
                                htmlForBoard = htmlForBoard.replace(
                                        wordRegexWithPrefixAndXmlTag,
                                        (_, attrs, wordText) => {

                                                return wordText;
                                        }
                                );
                                htmlForBoard = htmlForBoard.replace(
                                        optionRegexWithPrefixAndXmlTag,
                                        (_, attrs, text) => {
                                                // const attributes: Record<string, string> = {};

                                                // let match;
                                                // while ((match = attrRegex.exec(attrs)) !== null) {
                                                //   attributes[match[1]] = match[2];
                                                // }

                                                // if (attributes.id) {
                                                // }

                                                if (optionsIsEmpty) {
                                                        text = he.decode(text);
                                                        options.push(text);
                                                }

                                                return '';
                                        }
                                );
                        }
                        console.log(`wordsIds: ${wordsIds}, raw: ${raw}\n=======\n`)

                        if (!hasLettersOrNumbers(raw)) {
                                return
                        }

                        if (raw) {

                                // console.log(normalized, "****")
                                // textStream2.write(raw, true)
                                // textStream2.send()


                                ttsQueue = ttsQueue
                                        .catch(() => { })
                                        .then(async () => {

                                                if(abortSignal.aborted) {
                                                        console.log(`### ABORTED 1`)
                                                        return
                                                }

                                                let boardData: {type: BoardContentType, content: any} | undefined
                                                if(htmlForBoard && htmlForBoard?.length > 0) {

                                                        boardData = {
                                                                type: 'general',
                                                                content: {
                                                                        html: htmlForBoard
                                                                }
                                                        } 
                                                }
                                                else {
                                                        htmlForBoard = undefined
                                                }

                                                if(index !== 0) {
                                                        const prms: Promise<any>[] = [
                                                                prepareForTTS(raw)
                                                                .then(res => raw = res ?? '')
                                                        ]
                                                        
                                                        if(htmlForBoard) {
                                                                

                                                                prms.push(
                                                                        validateBoardContent({recordUsage}, htmlForBoard)
                                                                        .then(res => {
                                                                                console.log(`[validateBoardContent]: stepId: ${stepId},  ${res.isValid}, correctedContent: ${res.correctedContent}`)
                                                                                boardData = {
                                                                                        type: 'general',
                                                                                        content: {
                                                                                                html: res.isValid ? htmlForBoard : res.correctedContent
                                                                                        }
                                                                                }
                                                                        })
                                                                )
                                                                // console.log(`$$$$ ${board?.type}`)
                                                                // if(board?.type == "longDivision") {
                                                                //         prms.push(
                                                                //                 // generateLongDiv({recordUsage}, htmlForBoard)
                                                                //                 // .then(res => {
                                                                //                 //         boardData = {
                                                                //                 //                 type: board?.type,
                                                                //                 //                 content: res
                                                                //                 //         }
                                                                //                 // })
                                                                //                 // generateLongDiv2({recordUsage}, htmlForBoard)
                                                                //                 // .then(res => {
                                                                //                 //         boardData = {
                                                                //                 //                 type: "general",
                                                                //                 //                 content: {
                                                                //                 //                         html: res
                                                                //                 //                 },
                                                                //                 //         }
                                                                //                 // })
                                                                //                 beautifyHtml({recordUsage}, htmlForBoard)
                                                                //                 // beautifyHtmlClaude({recordUsage}, htmlForBoard)
                                                                //                 // generateLongDiv2({recordUsage}, htmlForBoard)
                                                                //                 .then(res => {
                                                                //                         boardData = {
                                                                //                                 type: "general",
                                                                //                                 content: {
                                                                //                                         html: res
                                                                //                                 },
                                                                //                         }
                                                                //                 })
                                                                //                 .catch(err => console.error(`Cannot generate ${board?.type} content. Error: ${err.message}.`))
                                                                //         )
                                                                // }
                                                                // else if(board?.type == "longMultiplication") {
                                                                //         prms.push(
                                                                //                 generateLongMultiply({recordUsage}, htmlForBoard)
                                                                //                 .then(res => {
                                                                //                         boardData = {
                                                                //                                 type: board?.type,
                                                                //                                 content: res,
                                                                //                         }
                                                                //                 })
                                                                //                 .catch(err => console.error(`Cannot generate ${board?.type} content. Error: ${err.message}.`))
                                                                //         )
                                                                // }
                                                                // else {

                                                                // //         prms.push(
                                                                // //         beautifyHtmlQwen({recordUsage}, htmlForBoard)
                                                                // //         .then(res => {
                                                                // //                 boardData = {
                                                                // //                         type: "general",
                                                                // //                         content: {
                                                                // //                                 html: res
                                                                // //                         },
                                                                // //                 }
                                                                // //         })
                                                                // // )
                                                                //         console.warn(`Unsupported board content type ${board?.type}`)
                                                                // }
                                                        }


                                                        await Promise.all(prms)
                                                }
                                                

                                                if(abortSignal.aborted) {
                                                        console.log(`### ABORTED 2`)
                                                        return
                                                }

                                                // if(writeToFile) {
                                                        fs.appendFileSync(`./initOpenAILiveText-2.txt`, raw + '\n', 'utf-8')
                                                        // }

                                                let localeCode = toLocale(lang) as LocaleCode
                                                if(!localeCode && currentUserLanguage) {
                                                        localeCode = toLocale(currentUserLanguage) as LocaleCode
                                                }


                                                raw = raw.replace(/<[^>]*>/g, '');

                                                let cc = raw
                                                cc = removeTashkeel(cc)

                                                if(localeCode) {
                                                        const toWords = new ToWords({
                                                                localeCode
                                                        });
                                                        const toWordsSA = new ToWords({
                                                                localeCode: 'ar-SA'
                                                        });
                                

                                                        raw = raw.replace(/[٠-٩]+(?:[.,٫][٠-٩]+)?/g, (match) => {
                                                                // Convert Arabic-Indic digits to Western digits
                                                                const number = match
                                                                        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                                                                        .replace('٫', '.');
                                                                
                                                                const res = toWordsSA.convert(Number(number));
                                                                
                                                                console.log(`[toWords] [ar-SA] ${number} -> ${res} `);
                                                                
                                                                return res;
                                                        });
                                                        raw = raw.replace(/[0-9٠-٩]+(?:[.,٫][0-9٠-٩]+)?/g, (match) => {
                                                                // Convert Arabic-Indic digits to Western digits
                                                                const number = match
                                                                        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                                                                        .replace('٫', '.');
                                                                
                                                                const res = toWords.convert(Number(number));
                                                                
                                                                console.log(`[toWords] [${localeCode}] ${number} -> ${res} `);
                                                                
                                                                return res;
                                                        });
                                                        fs.appendFileSync(`./initOpenAILiveText-3.txt`, raw + '\n', 'utf-8')
                                                }


                                                
                                                return await initGrokTTS(
                                                        wsClient,
                                                        raw!,
                                                        cc,
                                                        stepId,
                                                        wordsIds,
                                                        options.length > 1 ? options : [], // workaround when textToSay mentioned the correct option after reciving from the user
                                                        boardData,
                                                        abortSignal,
                                                        recordUsage,
                                                )
                                });
                                console.log('tts finished')
                        }
                },
                onCompleted: async () => {
                        
                        wsClient.send(
                                JSON.stringify({
                                        event: "ai-agent-status",
                                        status: 'ready',
                                })
                        );
                },
                callTool: async (msg) => {

                        console.log(`Calling tool`, msg)
                        if (msg.name == "writeOnTextbook") {
                                delegate.writeOnBook(msg.args.svgCode)
                        }
                        else if (msg.name == "writeOnBoard") {
                                delegate.writeOnBoard(msg.args.html)
                        }
                        else if (msg.name == "openTutorial") {
                                delegate.openTutorial(msg.args.tutorialId)
                        }
                        else if (msg.name == "changeTutorialStep") {
                                delegate.changeTutorialStep(msg.args.tutorialId, msg.args.stepNumber)
                        }
                        else if (msg.name == "getPageContent") {
                                return delegate.getPageContent(msg.args.pageNumber)
                        }
                        else if (msg.name == "showOptions") {
                                delegate.showOptions(msg.args.options)
                        }
                        return { succeed: true }
                },
                recordUsage
        }, undefined, "initOpenAILiveText-1")


        let arabicPromptAdded = false
        const setCurrentUserLanguage = (language: string) => {

                currentUserLanguage = language
                if(currentUserLanguage == "ar" && !arabicPromptAdded) {
                        
                        arabicPromptAdded = true;
                        textStream.write(`instructions-ar`, `
                                ## Arabic Pronunciation
                        
                                Apply Tashkeel only when it improves pronunciation.
                                
                                Focus on
                                
                                * Words that could be pronounced incorrectly.
                                * Ambiguous verb forms.
                                * Difficult mathematical terminology.
                                * Words whose pronunciation may confuse a text to speech engine.
                                
                                Do not overuse Tashkeel.
                                * Format content in rtl direction, and in arabic language. ensure text align to right side.
                        
                                `, true, 'system')
                }
        }

        // const textStream2 = await initOpenAILiveText(bookId, wsClient, {
        //         onMessage: (msg) => {
        //                 streamQueue2.push((msg.data?.content ?? '') + (msg.turnComplete ? '\n' : ''))
        //         },
        //         callTool: async (msg) => {

        //                 return { succeed: true }
        //         },
        //         recordUsage,
        // }, PROMPT_NORMALIZE_TEXT, "initOpenAILiveText-2")



        const cancelCurrentRequest = async () => {

                await streamQueueSingle.reset()
                await streamQueue1.reset()
                await streamQueue2.reset()
                await textStream.cancelLast()
        }


        let endedNotRecivedTimeout: any = undefined;

        setInterval(() => {

                const usage = chirp.getUsage(true)
                if (usage.costUsd > 0) {
                        if (usage.inputTokens) {
                                recordUsage(usage.costUsd, {
                                        type: 'tokens',
                                        tokens: {
                                                input: usage.inputTokens,
                                                output: usage.outputTokens,
                                        }
                                })
                        }
                        else if (usage.audioMinutes) {
                                recordUsage(usage.costUsd, {
                                        type: 'per-audio',
                                        audioMin: usage.audioMinutes
                                })
                        }
                        else {
                                console.error(`Uknown usage ${JSON.stringify(usage)}`)
                        }
                        console.log(usage.info)
                }

                console.log(`Total Cost of current session: ${totalCost}`)


        }, 5000)

        const booksByUid: {[key: string]: Deferred<BookM>} = {}

        return {
                handleMsg: async (packet: any) => {

                        if(!packet.language) {
                                throw new Error('language is missing')
                        }
                        setCurrentUserLanguage(packet.language)
                        currentStepId = packet.stepId

                        const bookUid = packet.currentBookUid

                        if(bookUid) {
                                if(!booksByUid[bookUid]) {
                                        booksByUid[bookUid] = new Deferred()

                                        const book = (await SERVICES?.getBook({
                                                uid: bookUid
                                        }, SCOPE))?.data.item
                
                                        if (!book) {
                                                throw new Error(`Book with uid ${bookUid} not found`)
                                        }

                                        booksByUid[bookUid].resolve(book)
                                }
                                if(packet.currentPageIndex === undefined) {
                                        throw new Error("Missing currentPageIndex")
                                }
                                currentPageIndex = packet.currentPageIndex
        
                                if (!loadedPages[currentPageIndex]) {
        
                                        loadedPages[currentPageIndex] = {}
                                        const imagesPath = path.join(__dirname, '../files/pdf-images/', bookUid);
                                
                                        const imageBuffer = await fs.readFileSync(`${imagesPath}/${currentPageIndex}`);
                                        const base64Image = imageBuffer.toString("base64");
                                        
                                        const dataUrl = `data:image/png;base64,${base64Image}`;
                                        console.log(`Loading image to ai ${currentPageIndex}`)
                                        
                                        textStream.write(`pdf-image-${currentPageIndex}`, dataUrl, false, 'user', "base64")
                                }
        
                                const book = await booksByUid[bookUid].promise

                                if (!loadedPages[currentPageIndex]?.analysis) {
        
                                        const page = book.pages[currentPageIndex]
                                        if (!page) {
                                                throw new Error(`page with index ${currentPageIndex} not exist in book ${bookUid}`)
                                        }
                                        //     const section = page.sectionId ? book.sections.find(s => s.id == page.sectionId) : undefined
                                        // const relatedPages = section ? book.pages.filter(p => p.sectionId == page.sectionId && p.pageNumber != page.pageNumber) : []
        
        
                                        try {
                                                if(!loadedPages[currentPageIndex].analysisDef) {

                                                        loadedPages[currentPageIndex].analysisDef = new Deferred()

                                                        const analysis = (await SERVICES?.getPageAnalysis({
                                                                uid: page.uid
                                                        }, SCOPE))?.data.item
                
                                                        if (!analysis) {
                                                                throw new Error("page analysis not found")
                                                        }
                                                        delete (analysis as any).words
                                                        for(const part of analysis.parts) {
                                                                if(part.transformedText)
                                                                        part.content = part.transformedText.full
                                                
                                                                delete part.transformedText
                                                        }
                                                        loadedPages[currentPageIndex].analysis = analysis
        
                                                        loadedPages[currentPageIndex].analysisDef?.resolve(analysis)

                                                        const pageContent = {
                                                                language: book.language,
                                                                page: analysis,
                                                                // relatedPages, 
                                                                // section: {
                                                                //     ...section, tutorials: [{id: '001', steps: tutorial1.steps}]
                                                                // } 
                                                        }
                                                        console.log(`Sending page-analysis to ai agent..`)
                                                        textStream.write(`page-analysis-${currentPageIndex}`, JSON.stringify(pageContent), true, 'system')
                                                }

                                                // commeted, it should response without waiting..
                                                // await loadedPages[currentPageIndex].analysisDef?.promise
                                        }
                                        catch (err: any) {
                                                console.error(`Cannot get page analysis ${page.uid}. Error: ${err.message}`)
                                        }


                                        if(!loadedPages[currentPageIndex].analysis && !loadedPages[currentPageIndex].analysisLock) {
                                                loadedPages[currentPageIndex].analysisLock = true
                                                const pageUid = `${bookUid}/${currentPageIndex}`
                                                wsClient.send(
                                                        JSON.stringify({
                                                                event: "ai-task",
                                                                task: 'page-analysis',
                                                                pageIndex: currentPageIndex,
                                                                status: 'started'
                                                        })
                                                )
                                                console.log(`page-analysis ${pageUid}..`)
                                                void SERVICES?.analyzePage({uid: pageUid}, SCOPE)
                                                .then(res => {
                                                        loadedPages[currentPageIndex].analysisDef = undefined
                                                        wsClient.send(
                                                                JSON.stringify({
                                                                        event: "ai-task",
                                                                        task: 'page-analysis',
                                                                        pageIndex: currentPageIndex,
                                                                        status: 'completed'
                                                                })
                                                        )
                                                })
                                                .catch(err => {

                                                        wsClient.send(
                                                                JSON.stringify({
                                                                        event: "ai-task",
                                                                        task: 'page-analysis',
                                                                        pageIndex: currentPageIndex,
                                                                        status: 'failed'
                                                                })
                                                        )
                                                        console.error(`Cannot analyze page ${pageUid}. Error: ${err.message}`)
                                                })
                                        }
        
                                }
                        }

                        const book = bookUid ? await booksByUid[bookUid].promise : undefined

                        options = []

                        if (packet.event === 'audio') {
                                // if (isToolCallExecuting) return; 

                                // const base64Chunk = packet.data;
                                // const rawAudioBuffer = Buffer.from(base64Chunk, 'base64');

                                // const int16Array = new Int16Array(
                                //   rawAudioBuffer.buffer,
                                //   rawAudioBuffer.byteOffset,
                                //   rawAudioBuffer.byteLength / 2
                                // );

                                // let totalAbsoluteEnergy = 0;
                                // for (let i = 0; i < int16Array.length; i++) {
                                //   totalAbsoluteEnergy += Math.abs(int16Array[i]);
                                // }
                                // const averageChunkVolume = totalAbsoluteEnergy / int16Array.length;

                                // const currentTimestamp = Date.now();

                                // // 🎙️ SPEECH DETECTION
                                // // Threshold 25 is the baseline. If volume is higher, user is speaking!
                                // if (averageChunkVolume >= 1000) {
                                //   // Refresh our voice activity timestamp marker to the present millisecond
                                //   lastActiveSpeechTimestamp = currentTimestamp;
                                // }

                                // // ⏱️ HANGOVER SAFETY GATE
                                // // Calculate how many milliseconds have elapsed since the user last spoke
                                // const msSinceLastSpeech = currentTimestamp - lastActiveSpeechTimestamp;

                                // // If the volume drops below 25, AND the 400ms hangover window has expired,
                                // // we can safely assume it is pure room silence and drop the packet to save costs.
                                // if (averageChunkVolume < 1000 && msSinceLastSpeech > HANGOVER_PADDING_MS) {
                                //   return; // Drop silent background noise locally on our server
                                // }

                                // // 💾 2. RECORD TO FILE SYSTEM
                                // // Only write audio frames that pass your volume gate.
                                // // This keeps your saved file completely clear of dead room silence!
                                // fileWriteStream.write(rawAudioBuffer);


                                // console.log(`Sending voice to Gemini. averageChunkVolume: ${averageChunkVolume}`)

                                // Stream the verified low-latency speech payload straight to Gemini
                                // if (notifyPageNumber) {
                                //   notifyPageNumber = false;
                                //   console.log(`Sending current page ${CURRENT_PAGE_NUMBER.value} to ai agent`)
                                //   await voiceAiSession?.streamText(`<instruction>Context update: Current page is now ${CURRENT_PAGE_NUMBER.value}.</instruction>`);
                                // }
                                // await voiceAiSession.streamAudio(packet.data);


                                if (packet.preroll) {
                                        // todo: pause the current process until recive resume or we receive new req


                                        await cancelCurrentRequest()
                                }

                                let packet2 = { ...packet }
                                delete packet2.data
                                console.log(packet2, '....')
                                chirp.write(packet.data)

                                const end = () => {

                                        if (endedNotRecivedTimeout) {
                                                clearTimeout(endedNotRecivedTimeout)
                                                endedNotRecivedTimeout = undefined
                                        }
                                        chirp.end()
                                }
                                clearTimeout(endedNotRecivedTimeout)
                                endedNotRecivedTimeout = setTimeout(() => {
                                        console.log(`voiced ending timeout defined`)
                                        end()
                                }, 2000)

                                if (packet.ended) {
                                        end()
                                }
                        }
                        // if(packet.event === "audio-ended") {
                        //     chirp.end()
                        // }
                        if (packet.event === "json") {
                                console.log(packet)
                                const data = JSON.parse(packet.data)

                                if (data.text) {
                                        await cancelCurrentRequest()

                                        let instructions = undefined
                                        if (packet.language == "ar")
                                          instructions = `عندما يكون المطلوب شرح استخدم writeOnBoard tool لكتابة ورسم محتوى منسق بشكل جميل`
                                        else
                                          instructions = `When it is requirment to explain, use writeOnBoard tool to visualize with rich html/svg content`
                
                                        if(currentStepId) {
                                                instructions += `\n current user stepId: ${currentStepId}`
                                        }
                                        textStream.write('user-text', data.text, true)
                                        textStream.send(instructions)

                                        wsClient.send(
                                                JSON.stringify({
                                                        event: "ai-agent-status",
                                                        status: 'thinking',
                                                })
                                        );
                                }
                                else if (data.action == "clarify-part") {
                                        await cancelCurrentRequest()
                                        const page = loadedPages[currentPageIndex]
                                        const part = page?.analysis?.parts?.find((p: any) => p.id == data.partId)
                                        if (part) {
                                                if (part.type?.includes("concept")) {
                                                        if (packet.language == "ar")
                                                                textStream.write(`user-clarify-concept`, `اشرح هذا المفهوم بالتفصيل مع الأمثلة واستخدم tool writeToBoard لكتابة ورسم محتوى منسق بشكل جميل{partId: ${data.partId}, content: ${part.content}}`, true)
                                                        else
                                                                textStream.write(`user-clarify-concept`, `explain this concept with more details and examples and use tool writeToBoard to visualize with rich html/svg content {partId: ${data.partId}, content: ${part.content}}`, true)
                                                }
                                                else if (part.type?.includes("example")) {
                                                        if (packet.language == "ar")
                                                                textStream.write(`user-clarify-example`, `اشرح هذا المثال بالتفصيل واستخدم واستخدم tool writeToBoard لكتابة ورسم محتوى منسق بشكل جميل{partId: ${data.partId}, content: ${part.content}}`, true)
                                                        else
                                                                textStream.write(`user-clarify-example`, `explain this example with more details and use tool writeToBoard to visualize with rich html/svg content {partId: ${data.partId}, content: ${part.content}}`, true)
                                                }
                                                else {
                                                        const parentPart = part.type.includes("question") && part?.parentId ? page?.analysis?.parts?.find((p: any) => p.id == part.parentId)! : undefined
                                                        const content = (parentPart?.type.includes("question_group") ? `${parentPart.content}\n` : '') + part.content

                                                        if (packet.language == "ar")
                                                                textStream.write(`user-clarify-question`, `اقرأ السؤل ثم اشرح هذا السؤال واستخدم tool writeToBoard لكتابة ورسم محتوى منسق بشكل جميل ثم اكتب ٣ خيارات باستخدام تاق {partId: ${data.partId}, content: ${content}}`, true)
                                                        else
                                                                textStream.write(`user-clarify-question`, `read this question then explain  and use tool writeToBoard to visualize with rich html/svg content, then write 3 options and use tag option {partId: ${data.partId}, content: ${content}}`, true)
                                                }
                                                textStream.send()


                                                wsClient.send(
                                                        JSON.stringify({
                                                                event: "ai-agent-status",
                                                                status: 'thinking',
                                                        })
                                                );
                                        }
                                        else {
                                                console.error(`part ID ${data.partId} not exist`)
                                        }
                                }
                                else {
                                        console.error(`Unkown mesg: ${JSON.stringify(packet)}`)
                                }
                        }
                        else if(packet.event == "cancel") {
                                await cancelCurrentRequest()
                        }
                        else if(packet.event == "pause") {
                                // await cancelCurrentRequest()
                        }
                        else if(packet.event == "resume") {
                                // await cancelCurrentRequest()
                        }
                }
        }
}

export function toLocale(language: string): string {
        return languageLocales[language.toLowerCase()] ?? language;
    }

const languageLocales: Record<string, string> = {
        ar: 'ar-SA',
        en: 'en-US',
        fr: 'fr-FR',
        es: 'es-ES',
        de: 'de-DE',
        it: 'it-IT',
        pt: 'pt-BR',
        ru: 'ru-RU',
        uk: 'uk-UA',
        pl: 'pl-PL',
        nl: 'nl-NL',
        sv: 'sv-SE',
        da: 'da-DK',
        no: 'nb-NO',
        fi: 'fi-FI',
        is: 'is-IS',
        el: 'el-GR',
        tr: 'tr-TR',
        he: 'he-IL',
        fa: 'fa-IR',
        ur: 'ur-PK',
        hi: 'hi-IN',
        bn: 'bn-BD',
        ta: 'ta-IN',
        te: 'te-IN',
        ml: 'ml-IN',
        kn: 'kn-IN',
        mr: 'mr-IN',
        gu: 'gu-IN',
        pa: 'pa-IN',
        zh: 'zh-CN',
        ja: 'ja-JP',
        ko: 'ko-KR',
        th: 'th-TH',
        vi: 'vi-VN',
        id: 'id-ID',
        ms: 'ms-MY',
        fil: 'fil-PH',
        tl: 'fil-PH',
        sw: 'sw-KE',
        af: 'af-ZA',
        am: 'am-ET',
        zu: 'zu-ZA',
        xh: 'xh-ZA',
        yo: 'yo-NG',
        ig: 'ig-NG',
        ha: 'ha-NG',
        so: 'so-SO',
        km: 'km-KH',
        lo: 'lo-LA',
        my: 'my-MM',
        ne: 'ne-NP',
        si: 'si-LK',
        ka: 'ka-GE',
        hy: 'hy-AM',
        az: 'az-AZ',
        kk: 'kk-KZ',
        uz: 'uz-UZ',
        mn: 'mn-MN',
        bs: 'bs-BA',
        hr: 'hr-HR',
        sr: 'sr-RS',
        sl: 'sl-SI',
        sk: 'sk-SK',
        cs: 'cs-CZ',
        hu: 'hu-HU',
        ro: 'ro-RO',
        bg: 'bg-BG',
        mk: 'mk-MK',
        sq: 'sq-AL',
        et: 'et-EE',
        lv: 'lv-LV',
        lt: 'lt-LT',
        ga: 'ga-IE',
        cy: 'cy-GB',
        mt: 'mt-MT',
    };

    function removeTashkeel(text: string): string {
        return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
    }