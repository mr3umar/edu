import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { convertPdfToImages } from './pdf-to-images.js';
// import { analyzeTextbookImage, denormalize, denormalize2, IMG_H, IMG_W } from './ocr-service.js';
import { getBookStructure } from './book-structure-service.js';
import { getBookConcepts } from './teaching-plan-service.js';
import { analyzeTextbookImage } from './ocr-service-openai.js';
import { analyzeTextbookImageWithGemini, denormalize2, IMG_H, IMG_W } from './ocr-service.js';
import { DocumentRoot, removeDirectorySync, transformToGlobalWordLayout } from './functions.js';

// const pdfFileName = `math-05-1`;
// const pdfFileName = `english-med-1-1`;
const pdfFileName = `math-06-mawhibah`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfFilePath = path.join(__dirname, '../books/', pdfFileName) + '.pdf';
const imagesPath = path.join(__dirname, '../books/images/', pdfFileName);
const jsonFilePath = path.join(__dirname, '../books/json/', pdfFileName);
const sturcturesFilePath = path.join(__dirname, '../books/sturctures/');
const conceptsFilePath = path.join(__dirname, '../books/concepts/', pdfFileName);

const REGENRATE_IMAGES = false
const REGENRATE_JSON = true
const RETRANSFORM_WORDS = true
const REGENRATE_STRUCTURE = false
const REGENERATE_CONCEPTS = false
const FROM_PAGE = 10
const TO_PAGE = 10

// remaining: 5-9, 12-20

;(async () => {
        const imageExists = fs.existsSync(imagesPath)
        if(imageExists && REGENRATE_IMAGES) {
                removeDirectorySync(imagesPath)
        }
        if(!imageExists || REGENRATE_IMAGES) {
                fs.mkdirSync(imagesPath)
                console.info(`Generating PDF images..`)
                await convertPdfToImages({
                        pdfPath: pdfFilePath,
                        outputDir: imagesPath,
                        // imageFormat: 'png',
                })
        }

        if(!fs.existsSync(imagesPath))
                fs.mkdirSync(jsonFilePath)

        if(!fs.existsSync(`${jsonFilePath}`)) {
            fs.mkdirSync(jsonFilePath)
        }

        for(let i=FROM_PAGE; i<=TO_PAGE; i++) {

                const exists = fs.existsSync(`${jsonFilePath}/${i}.json`)
                if(exists && !REGENRATE_JSON) {
                        continue
                }

                console.info(`Analyzing page ${i}..`)
                // const parts = (await analyzeTextbookImage(`${imagesPath}/${pdfFileName}.${i}.png`)) as DocumentRoot
                const parts = (await analyzeTextbookImageWithGemini(`${imagesPath}/${pdfFileName}.${i}.png`, IMG_W, IMG_H))

                const page = {
                  parts
                }
                
                if(exists) {
                        fs.rmSync(`${jsonFilePath}/${i}.json`)
                }
                fs.writeFileSync(`${jsonFilePath}/${i}.json`, JSON.stringify(page, null, '\t'), {encoding: "utf-8"})
        }


        if(RETRANSFORM_WORDS) {
          for(let i=FROM_PAGE; i<=TO_PAGE; i++) {

                  const file = fs.readFileSync(`${jsonFilePath}/${i}.json`, {'encoding': 'utf-8'})
                  let json = JSON.parse(file)

                  if(!json.parts)
                          json = {parts: json}


                  console.info(`Transforming page ${i} words..`)
                  const a = await transformToGlobalWordLayout(json.parts)
                  
                  a.words = a.words.map((word: any) => ({
                          ...word,
                          pixel_coordinates: denormalize2(
                                  word.x,
                                  word.y,
                                  IMG_W, IMG_H
                          )
                  }));
                  fs.writeFileSync(`${jsonFilePath}/${i}.json`, JSON.stringify(a, null, '\t'), {encoding: "utf-8"})
                  
          }
        }


        const exists = fs.existsSync(`${sturcturesFilePath}/${pdfFileName}.json`)
        if(!exists || REGENRATE_STRUCTURE) {
          console.info(`Analyzing structure..`)

          const pages = []
          for(let i=FROM_PAGE; i<=TO_PAGE; i++) {

            const file = fs.readFileSync(`${jsonFilePath}/${i}.json`, 'utf-8')
            const page = JSON.parse(file)
            page.pageNumber = String(i)
            

            page.parts = page.parts.filter((p: any) => p.type == "title")

            for(const part of page.parts) {
              delete part.content2
              delete part.transformedText
              delete part.coordinates
              delete part.pixel_coordinates
            }
            delete page.words

            pages.push(page)
          }
          const structure = await getBookStructure({
            pages
          })
          fs.writeFileSync(`${sturcturesFilePath}/${pdfFileName}.json`, JSON.stringify(structure, null, "\t"))
        }


        const conceptsExists = fs.existsSync(conceptsFilePath)
        if(!conceptsExists) {
                fs.mkdirSync(conceptsFilePath)
        }

        const pages = []
        for(let i=FROM_PAGE; i<=TO_PAGE; i++) {

          const file = fs.readFileSync(`${jsonFilePath}/${i}.json`, 'utf-8')
          const page = JSON.parse(file)
          page.pageNumber = String(i)

          for(const part of page.parts) {
            delete part.content2
            delete part.transformedText
            delete part.coordinates
            delete part.pixel_coordinates
          }
          delete page.words

          pages.push(page)
        }

        const book: any = {pages}
        const structure = fs.readFileSync(`${sturcturesFilePath}/${pdfFileName}.json`, 'utf-8')
        const strucJson = JSON.parse(structure)

        const lessonsSections = strucJson.sections.filter((s: any) => s.level == "lesson")
        book.sections = lessonsSections.map((s: any) => ({id: s.id, title: s.title}))
        strucJson.pages.forEach((sp: any) => {
          const page = book.pages.find((p: any) => p.pageNumber == sp.pageNumber)
          if(page) {
            page.sectionId = sp.sectionId
          }
        });

        for(const lesson of lessonsSections) {
          const exists = fs.existsSync(`${conceptsFilePath}/${lesson.id}.json`)
          
          if(!exists || REGENERATE_CONCEPTS) {
            console.info(`Analyzing concepts for lesson ${lesson.id}..`)

            if(lesson.id !== "103")continue;

            
            const lessonPages = book.pages.filter((p: any) => p.sectionId == lesson.id)
          
            const concepts = await getBookConcepts({
              lessonPages
            })
            fs.writeFileSync(`${conceptsFilePath}/${lesson.id}.json`, JSON.stringify(concepts, null, "\t"))
            
          }
        }
        
        
        // const bytes = await extractSinglePdfPage({sourcePdfPath: pdfFilePath, pageNumber: 5})
        // const b = await analyzeTextbookPdfPage(bytes)
        // fs.writeFileSync(`${jsonFilePath}---.json`, JSON.stringify(b, null, '\t'), {encoding: "utf-8"})
})()

