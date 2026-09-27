import { APP_ID, createCacheRepo, DEPLOYMENT_ID, initServices, ServiceResult, servicesLib, Context } from 'edu-ai-domain';
import { ENV_TARGET, INSTANCE_ID, PORT, SCOPE, USERS_IAM } from './config.js';
import { createContext } from './context.js';
import { createServiceFetch } from './common/fetch.js';
import { createServer } from './common/server.js';
import { CLOUD_PUBLIC_KEY } from './keys/index.js';
import { createTajData } from './taj-data/index.js';
import { AccessKeyData, GetDeployment, GetInstance, SignAccessKey } from '@dija/gormic-cloud-public';
// import { createFetchNotifications } from './fetch-notifications';
import { CheckPermissionForUser } from '@dija/gormic-iam-public';
import { CryptoUtil } from './common/crypto.js';
import * as fs from 'fs';
import { renderPdf } from './context/pdfToImages.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLOUD_PRIVATE_KEY_PROD } from './cloud/keys/prod.js';
import { CLOUD_PRIVATE_KEY_TEST } from './cloud/keys/test.js';
import { ocrSpace } from 'ocr-space-api-wrapper';
import { OCRSpaceResponse, RecordUsage } from './types.js';
import { getBookStructure2 } from './book-structure-service-2.js';
import { getOrCreateThumbnail, isValidThumbnailSize } from './thumbnail.js';
import { analyzeTextbookImageWithGemini, denormalize2, IMG_H, IMG_W } from './ocr-service.js';
import { DocumentRoot, transformToGlobalWordLayout } from './functions.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let SERVICES: Awaited<ReturnType<typeof getServices> | undefined> = undefined

const getServices = async () => {

    
    const fetch = createServiceFetch();

    const context = createContext({
        // getInstance: cloudServices.getInstance,
    }, fetch);

    const tajData = await createTajData()

    // const installRes = await tajData.install({
    //     instanceId: INSTANCE_ID,
    // }, {
    //     instanceId: INSTANCE_ID
    // })
    // console.log(JSON.stringify(installRes))

    const fileStrams: {[key: string]: fs.WriteStream} = {}
    const fileLocks: Record<string, Promise<void>> = {};

    const appendFile: Context.AppendFile = async (
        scope,
        type,
        fileId,
        fileName,
        fileSize,
        isCompleted,
        chunkIndex,
        data
    ) => {
        const previous = fileLocks[fileId] ?? Promise.resolve();

        const current = previous.then(async () => {
            if (!fileStrams[fileId]) {
                const dir = `./files/${type}`;

                await fs.promises.mkdir(dir, { recursive: true });

                fileStrams[fileId] = fs.createWriteStream(
                    `${dir}/${fileId}`
                );
            }

            const stream = fileStrams[fileId];

            if (data) {
                await write(stream, data);
                console.log(`[chunk ${chunkIndex} completed]`)
            }

            if (isCompleted) {
                await new Promise<void>((resolve, reject) => {
                    stream.once('finish', resolve);
                    stream.once('error', reject);

                    stream.end();
                });

                console.log(`[FILE COMPLETED]`)
                delete fileStrams[fileId];
            }
        });

        fileLocks[fileId] = current;

        try {
            await current;
        } finally {
            if (fileLocks[fileId] === current) {
                delete fileLocks[fileId];
            }
        }
    };
    const pdfToImages: Context.PdfToImages = async (scope, fileId) => {
        console.log(`PDF_TO_IMAGES`)

        const path = `./files/pdf/${fileId}`
        const pdfBuffer: Buffer = await fs.promises.readFile(path);

        let pagesCount: number | undefined = undefined
        renderPdf(pdfBuffer, {
            onDocument: async (info) => {
                const imagesPath = `./files/pdf-images/${fileId}`
                console.log(`onDocument: ${info.pages}`)

                pagesCount = info.pages

                await fs.promises.mkdir(imagesPath, {
                    recursive: true
                })
                await services.onPdfParsed({
                    uploadUid: fileId,
                    pagesCount: info.pages,
                }, SCOPE)

            },
            onPage: async (info) => {
                const pageIndex= info.page - 1
                const imagePath = `./files/pdf-images/${fileId}/${pageIndex}`

                console.log(`onPage: ${pageIndex}, ${pageIndex}, ${info.width}, ${info.height}`)
                await fs.promises.writeFile(imagePath, info.image);
                await services.onPdfPageParsed({
                    uploadUid: fileId,
                    pageIndex: pageIndex,
                    width: info.width,
                    height: info.height,
                    fileSize: info.fileSize,
                }, SCOPE)

            },
            onEnd: async () => {

                await services.onPdfParseEnd({
                    uploadUid: fileId
                }, SCOPE)
            }
        })


    }

    const extractText: Context.extractText = async (scope, bookUid, pageIndex) => {
        // const res1 = await ocrSpace('http://dl.a9t9.com/ocrbenchmark/eng.png');


        const imagesPath = path.join(__dirname, '../files/pdf-images/', bookUid);

        const imageBuffer = await fs.readFileSync(`${imagesPath}/${pageIndex}`);
        const base64Image = imageBuffer.toString("base64");
        
        const dataUrl = `data:image/png;base64,${base64Image}`;
        
        const result = await ocrSpace(dataUrl, { 
            apiKey: process.env.OCRSPACE_API_KEY, 
            OCREngine: '3',
            language: 'ara' ,
            filetype: 'PNG',
            // detectOrientation: 
            // isTable, //If set to true, the OCR logic makes sure that the parsed text result is always returned line by line. This switch is recommended for table OCR, receipt OCR, invoice processing and all other type of input documents that have a table like structure.
        });

        // console.log(`OCRSpace Result: ${JSON.stringify(result)}`)
        // {"ParsedResults":[{"TextOverlay":{"Lines":[],"HasOverlay":false,"Message":"Overlay not requested."},"TextOrientation":"0","FileParseExitCode":1,"ParsedText":"# الفهرس\n\n## الفصل الأول: القيمة المنزلية\n\nالتهيئة\n١ القيمة المنزلية ضمن البلايين\n٢ المقارنة بين الأعداد\nاستكشاف الكسور الاعتيادية والكسور العشرية\n٣ تمثيل الكسور العشرية\n٤ القيمة المنزلية ضمن أجزاء الألف\nاختبار منتصف الفصل\n٥ مقارنة الكسور العشرية\n٦ ترتيب الأعداد والكسور العشرية\n٧ خطة حل المسألة التخمين والتحقق\nهيا بنا نلعب\nاختبار الفصل\nالاختبار التراكمي\n\n## الفصل الثاني: الجمع والطرح\n\nالتهيئة\n١ تقريب الأعداد والكسور العشرية\n٢ تقدير نواتج الجمع والطرح\n٣ خطة حل المسألة الحل عكسيا\nاختبار منتصف الفصل\nاستكشاف جمع الكسور العشرية وطرحها\n٤ جمع الكسور العشرية وطرحها\nهيا بنا نلعب\n٥ خصائص الجمع\n٦ الجمع والطرح ذهنيا\nاختبار الفصل\nالاختبار التراكمي\n\n## الفصل الثالث: الضرب\n\nالتهيئة\n١ أنماط الضرب\nاستكشاف الضرب الذهني\n٢ خاصية التوزيع\n٣ تقدير نواتج الضرب\n٤ الضرب في عدد من رقم واحد\nاختبار منتصف الفصل\n٥ خطة حل المسألة رسم صورة\n٦ الضرب في عدد من رقمين\n٧ خصائص الضرب\n٨ استقصاء حل المسألة\nاختبار الفصل\nالاختبار التراكمي\n\nوزارة التعليم\nMinistry of Education","ErrorMessage":"","ErrorDetails":""}],"OCRExitCode":1,"IsErroredOnProcessing":false,"ProcessingTimeInMilliseconds":"2608","SearchablePDFURL":""}

        let text = result.ParsedResults[0].ParsedText!
        text = text.replace(/([.\-_])\1+/g, '$1');
        return text
    
    }


    let totalCost = 0
    const recordUsage: RecordUsage = async (cost, usage) => {
            if (usage.type == 'tokens') {
                    console.log(usage.info)
            }

            totalCost += cost
    }
    
    const generateBookStructure: Context.generateBookStructure = async (scope, texts) => {

        const input = texts.map((text, i) => ({
            pageIndex: i,
            text
        }))


        console.log(`TEXTS: ` + JSON.stringify(input))
        const result = await getBookStructure2(input, {recordUsage})

        console.log(`STRUCTURE:  ` + JSON.stringify(result))

        return {
            ...result,
            sections: result.sections,
            pages: result.pages
        }
    }

    const analyzePage: Context.analyzePage = async (scope, bookUid, pageIndex, pageWidth, pageHight) => {

        const imagePath = path.join(__dirname, '../files/pdf-images/', bookUid, String(pageIndex));

        let parts = await analyzeTextbookImageWithGemini(imagePath, pageWidth, pageHight)

        const wordsRes = await transformToGlobalWordLayout(parts)
        
        parts = wordsRes.parts

        const words = wordsRes.words
        .map((word: any) => {
            const d = denormalize2(
                word.x,
                word.y,
                pageWidth, pageHight
            )
            return {
                ...word,
                x: d.x,
                y: d.y, 
            }
        });

        return {
            parts,
            words,
        }
    }

    const services = initServices(
        APP_ID,
        servicesLib,
        {
            cacheRepo: createCacheRepo(),
        },
    )({
        ...context,
        appendFile,
        pdfToImages,
        extractText,
        generateBookStructure,
        getClientIamId: async () => {
            return USERS_IAM
        },
        getClientUserId: async (scope) => context.getUserId(scope),
        getSource: async () => APP_ID,
        analyzePage,
    }, {
        tajData,
        cloud: {
            signAccessKey: async (params, scope) => {
                const text = JSON.stringify({
                    iamId: params.iamId,
                    ownerId: params.ownerId,
                    instanceIds: params.instanceIds,
                    include: params.include,
                })
                const privateKey = ENV_TARGET == "PROD" ? CLOUD_PRIVATE_KEY_PROD : CLOUD_PRIVATE_KEY_TEST
                const token = CryptoUtil.signPayload(text, privateKey)
                    
                const result: ServiceResult<SignAccessKey> = {
                    app: APP_ID,
                    service: 'signAccessKey',
                    data: {
                        token
                    },
                    warnings: []
                }

                return result
            }
        }
        // core: coreServices,
        // sevenrooms: {},
        // om: {
        //     getOrderV2: omServices.getOrderV2
        // },
        // omTajData: {
        //     getItems: subTajDataServices.getItems
        // },
        // flowTajData: {
        //     getItems: subTajDataServices.getItems
        // },
        // crmTajData: {
        //     getItems: subTajDataServices.getItems
        // },
        // contactCenterTajData: {
        //     getItems: subTajDataServices.getItems
        // },
        // flow: {
        //     getWaitEntry: flowServices.getWaitEntry,
        //     getReservation: flowServices.getReservation,
        // },
        // scheduler: {
        //     createJob: schedulerServices.createJob,
        //     cancelJob: schedulerServices.cancelJob,
        //     pauseJob: schedulerServices.pauseJob,
        //     resumeJob: schedulerServices.resumeJob,
        //     getJob: schedulerServices.getJob,
        // },
        // bi: {
        //     getDataModel: biServices.getDataModel,
        //     buildDataModel: biServices.buildDataModel,
        // },
        
    });

    SERVICES = services


    return services;
}
const start = async () => {
    const services = await getServices()
    
    const server = createServer(
        APP_ID,
        DEPLOYMENT_ID,
        services,
        // cloudServices.getInstance,
        async () => {
            const result: ServiceResult<GetDeployment> = {
                app: APP_ID,
                service: 'getDeployment',
                data: {
                    deployment: {
                        appId: APP_ID,
                        id: DEPLOYMENT_ID,
                        endpoints: [],
                        resources: [{
                            key: 'signIn',
                            access: 'anonymous'
                        }, {
                            key: 'signUp',
                            access: 'anonymous'
                        }, {
                            key: 'resetPassword',
                            access: 'anonymous'
                        }],
                        operations: {}
                    }
                },
                warnings: []
            }
            return result
        },
        async () => {
            const result: ServiceResult<CheckPermissionForUser> = {
                app: APP_ID,
                service: 'checkPermissionForUser',
                data: {
                    action: 'allow'
                },
                warnings: []
            }
            return result

        },
        // [],
        CLOUD_PUBLIC_KEY,
        INSTANCE_ID,
        async (req, res) => {

            const url = new URL(req.url || '/', `http://${req.headers.host}`);

            // Expected: /books/:book_id/pages/:page_id
            const matchBookPageImage = url.pathname.match(
                /^\/book\/([^/]+)\/page\/([^/]+)$/
            );
            const matchBookThumbnail = url.pathname.match(
                /^\/book\/([^/]+)\/thumbnail\/([^/]+)$/
            );

            if(matchBookPageImage) {
            
            
                const [, book_id, page_id] = matchBookPageImage;
            
                const booksRoot = path.resolve(__dirname, '..', 'files');
                const imageDirectory = path.join(booksRoot, 'pdf-images', book_id);
                const imageName = page_id;
                const fullPath = path.resolve(imageDirectory, imageName);
            
                // Security check
                if (!fullPath.startsWith(booksRoot + path.sep)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid path request' }));
                    return;
                }
            
                console.log(fullPath)
                // Check file
                if (!fs.existsSync(fullPath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Book page image not found' }));
                    return;
                }
            
                // Get file information
                fs.stat(fullPath, (statErr, stat) => {
                    if (statErr || !stat.isFile()) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Book page image not found' }));
                        return;
                    }
            
                    res.writeHead(200, {
                        'Content-Type': 'image/png',
                        'Content-Disposition': 'inline',
                        'Content-Length': stat.size,
                    });
            
                    const stream = fs.createReadStream(fullPath);
            
                    stream.on('error', (err) => {
                        console.error('Image stream error:', err);
            
                        if (!res.headersSent) {
                            res.writeHead(500, {
                                'Content-Type': 'application/json',
                            });
                            res.end(JSON.stringify({
                                error: 'Could not display the image.',
                            }));
                        } else {
                            res.destroy(err);
                        }
                    });
            
                    stream.pipe(res);
                });
            }


            if(matchBookThumbnail) {

                const [, book_id, size] = matchBookThumbnail;
            
                if (!isValidThumbnailSize(size)) {

                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid thumbnail size' }));
                    return;
            }
                const booksRoot = path.resolve(__dirname, '..', 'files');
                const thumbnailPath = await getOrCreateThumbnail(book_id, size as "sm" | "md" | "lg")
            
                // Check file
                if (!fs.existsSync(thumbnailPath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Book thumbnail image not found' }));
                    return;
                }
            
                // Get file information
                fs.stat(thumbnailPath, (statErr, stat) => {
                    if (statErr || !stat.isFile()) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Book page image not found' }));
                        return;
                    }
            
                    res.writeHead(200, {
                        'Content-Type': 'image/png',
                        'Content-Disposition': 'inline',
                        'Content-Length': stat.size,
                    });
            
                    const stream = fs.createReadStream(thumbnailPath);
            
                    stream.on('error', (err) => {
                        console.error('Image stream error:', err);
            
                        if (!res.headersSent) {
                            res.writeHead(500, {
                                'Content-Type': 'application/json',
                            });
                            res.end(JSON.stringify({
                                error: 'Could not display the image.',
                            }));
                        } else {
                            res.destroy(err);
                        }
                    });
            
                    stream.pipe(res);
                });
            }
        }
    );

    server.listen(PORT, () => {
        console.log(`Start listening on ${PORT} for services`);
    });

    for (const s in services) {
        const cs = s.substring(0, 1).toLocaleUpperCase() + s.substring(1);
        console.log(`${s}: {} as ${cs},`);
    }

    // {
    //     const fetchNotfication = createFetchNotifications({
    //         pullNotifications: cloudServices.pullNotifications,
    //         getInstance: cloudServices.getInstance,
    //         handlers: {
    //             processPOSTransactional: services.processPOSTransactional,
    //             processFlowTransactional: services.processFlowTransactional,
    //             processCRMEvents: services.processCRMEvents,
    //             processContactCenterTransactional: services.processContactCenterTransactional,
    //         },
    //     });

    //     let running = false
    //     setInterval(async () => {
    //         if(running){
    //             return running
    //         }
    //         running = true
    //         try{
    //             await fetchNotfication()
    //         }
    //         catch(err){
    //             console.error(err)
    //         }
    //         running = false
    //     }, 1000 * 30);
    // }

    return {
        services
    }
};

void start();

const write = (
    stream: fs.WriteStream,
    data: Buffer
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const onError = (err: Error) => {
            cleanup();
            reject(err);
        };

        const onDrain = () => {
            cleanup();
            resolve();
        };

        const cleanup = () => {
            stream.off('error', onError);
            stream.off('drain', onDrain);
        };

        stream.once('error', onError);

        if (stream.write(data)) {
            cleanup();
            resolve();
        } else {
            stream.once('drain', onDrain);
        }
    });
};