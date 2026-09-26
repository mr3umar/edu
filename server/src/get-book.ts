import * as fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';
import { BOOKS_URL } from './index.js';
import he from 'he';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// const pdfFilePath = path.join(__dirname, '../books/', pdfFileName) + '.pdf';
const imagesPath = path.join(__dirname, '../books/images/');
// const jsonFilePath = path.join(__dirname, '../books/json/', pdfFileName);
const sturcturesFilePath = path.join(__dirname, '../books/sturctures/');
const conceptsFilePath = path.join(__dirname, '../books/concepts/');

export const getBook  = async (bookId: string, include: {schema: boolean}) => {

        let strucJson: any = {}
        try {

        const structure = fs.readFileSync(`${sturcturesFilePath}/${bookId}.json`, 'utf-8')
        strucJson = JSON.parse(structure)

        }
        catch(err) {
                console.error(err)
        }

        

        const images = await listFiles(`${imagesPath}/${bookId}`)

        const pages = images.map(imagePath => {
                        const pageNumber = Number(imagePath.split(".").slice(-2, -1)[0])

                        if(pageNumber < 9) {
                                return
                        }
                        if(pageNumber > 20)
                                return; //TODO

                        const jsonDirectory = path.join(__dirname, '..', 'books', 'json', bookId);
                        const jsonName = `${pageNumber}.json`; // Or .png, depending on your setup
                        const fullPath = path.join(jsonDirectory, jsonName);
                

                        let json: any = {
                                parts: [],
                        }
                try {
                        const jsonText = fs.readFileSync(fullPath, 'utf-8')
                        json = JSON.parse(jsonText)

                }
                catch(err) {
                        console.error(err)
                }

                        if(!json.words) {
                                json.words = []
                        }

                        for(const part of json.parts) {
                                // part.content = part.content2
                                if(part.transformedText)part.content = part.transformedText.full
                                delete part.content2
                                delete part.transformedText

                                if(part.pixel_coordinates) {
                                        part.coordinates = part.pixel_coordinates
                                        delete part.pixel_coordinates
                                }

                                if(part.coordinates?.min_x) {
                                        part.coordinates.x = part.coordinates.min_x
                                        part.coordinates.y = part.coordinates.min_y
                                        part.coordinates.width = part.coordinates.max_x - part.coordinates.min_x
                                        part.coordinates.height = part.coordinates.max_y - part.coordinates.min_y

                                        delete part.coordinates.min_x
                                        delete part.coordinates.min_y
                                        delete part.coordinates.max_x
                                        delete part.coordinates.max_y
                                }
                        }

                        for(const word of json.words) {
                                word.x = word.pixel_coordinates.x
                                word.y = word.pixel_coordinates.y
                                delete word.pixel_coordinates
                        }


                        return {
                                pageNumber,
                                width: 637,
                                height: 821,
                                imageUrl: `${BOOKS_URL}/book/${bookId}/${pageNumber}`,
                                words: [],
                                ...json,
                        }
        })
        .filter(p => p !== undefined)
        .sort((a, b) => a.pageNumber - b.pageNumber)


        strucJson.pages.forEach((sp: any) => {
                const page = pages.find((p: any) => p.pageNumber == sp.pageNumber)
                if(page) {
                        page.sectionId = sp.sectionId
                }
        });

        const sections = []
        for(const section of strucJson.sections) {
                const exists = fs.existsSync(`${conceptsFilePath}/${bookId}/${section.id}.json`)

                if(exists) {
                        const concFile = fs.readFileSync(`${conceptsFilePath}/${bookId}/${section.id}.json`, 'utf-8')
                        const concJson = JSON.parse(concFile)
                        section.concepts = concJson.concepts
                        sections.push({
                                ...section,
                                ...concJson
                        })
                }
        }

        return {
                language: bookId.includes("english") ? 'en' : 'ar',
                pages,
                sections,
        }
}


async function listFiles(dir: string): Promise<string[]> {
        const entries = await fs.readdirSync(dir);
      
        const files = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(dir, entry);
      
            return fullPath;
          })
        );
      
        return files.flat();
      }


export const tutorial1 = {
        "steps": [
                {
                        "stepNumber": 1,
                        "svgElements": [
                                "title",
                                "numberGroup"
                        ],
                        "textToSay": "تخيّل أن العدد ٤٢٨١٣ مثل شارع فيه خمسة بيوت. كل رقم يسكن في بيت، واسم البيت يغيّر قيمة الرقم!"
                },
                {
                        "stepNumber": 2,
                        "svgElements": [
                                "chart",
                                "colOnes",
                                "digit3",
                                "value3"
                        ],
                        "textToSay": "نبدأ من اليمين دائمًا: الرقم ٣ في بيت الآحاد، لذلك قيمته ٣ فقط."
                },
                {
                        "stepNumber": 3,
                        "svgElements": [
                                "colTens",
                                "digit1",
                                "value10"
                        ],
                        "textToSay": "ننتقل خطوة إلى اليسار: الرقم ١ في بيت العشرات، يعني ١ عشرة؛ إذن قيمته ١٠."
                },
                {
                        "stepNumber": 4,
                        "svgElements": [
                                "colHundreds",
                                "digit8",
                                "value800"
                        ],
                        "textToSay": "الرقم ٨ في بيت المئات، يعني ٨ مئات؛ إذن قيمته ٨٠٠."
                },
                {
                        "stepNumber": 5,
                        "svgElements": [
                                "colThousands",
                                "digit2",
                                "value2000"
                        ],
                        "textToSay": "الرقم ٢ في بيت الآلاف، يعني ٢ من الألوف؛ إذن قيمته ٢٠٠٠."
                },
                {
                        "stepNumber": 6,
                        "svgElements": [
                                "colTenThousands",
                                "digit4",
                                "value40000"
                        ],
                        "textToSay": "الرقم ٤ في بيت عشرات الألوف، يعني ٤ عشرات ألوف؛ إذن قيمته ٤٠٠٠٠."
                },
                {
                        "stepNumber": 7,
                        "svgElements": [
                                "expandedForm",
                                "ruleBox"
                        ],
                        "textToSay": "والآن نجمع القيم المنزلية كلها: ٤٢٨١٣ = ٤٠٠٠٠ + ٢٠٠٠ + ٨٠٠ + ١٠ + ٣. هذه هي صورة العدد المفككة حسب المنازل."
                }
        ],
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"40 20 920 600\" width=\"920\" height=\"600\" role=\"img\" aria-label=\"شرح القيم المنزلية للعدد ٤٢٨١٣\">\n  <style>\n    .title{font-family:Tahoma,Arial,sans-serif;font-size:34px;font-weight:700;fill:#1f2937;}\n    .subtitle{font-family:Tahoma,Arial,sans-serif;font-size:20px;fill:#374151;}\n    .label{font-family:Tahoma,Arial,sans-serif;font-size:19px;font-weight:700;fill:#111827;}\n    .digit{font-family:Tahoma,Arial,sans-serif;font-size:42px;font-weight:700;fill:#111827;}\n    .value{font-family:Tahoma,Arial,sans-serif;font-size:25px;font-weight:700;fill:#111827;}\n    .small{font-family:Tahoma,Arial,sans-serif;font-size:18px;fill:#374151;}\n    .math{font-family:Tahoma,Arial,sans-serif;font-size:30px;font-weight:700;fill:#111827;}\n    .cell{stroke:#334155;stroke-width:2;}\n    .arrow{stroke:#64748b;stroke-width:2.2;fill:none;marker-end:url(#arrowHead);}\n  </style>\n  <defs>\n    <marker id=\"arrowHead\" markerWidth=\"10\" markerHeight=\"10\" refX=\"8\" refY=\"3\" orient=\"auto\" markerUnits=\"strokeWidth\">\n      <path d=\"M0,0 L8,3 L0,6 Z\" fill=\"#64748b\"/>\n    </marker>\n  </defs>\n\n  <text id=\"title\" x=\"500\" y=\"55\" text-anchor=\"middle\" direction=\"rtl\" class=\"title\">القيم المنزلية في العدد ٤٢٨١٣</text>\n  <text x=\"500\" y=\"88\" text-anchor=\"middle\" direction=\"rtl\" class=\"subtitle\">كل رقم يأخذ قيمته من المنزل الذي يقف فيه</text>\n\n  <g id=\"numberGroup\">\n    <text x=\"500\" y=\"130\" text-anchor=\"middle\" direction=\"rtl\" class=\"small\">العدد</text>\n    <rect x=\"300\" y=\"145\" width=\"400\" height=\"60\" rx=\"14\" fill=\"#f8fafc\" stroke=\"#94a3b8\" stroke-width=\"2\"/>\n    <text id=\"topDigit4\" x=\"370\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٤</text>\n    <text id=\"topDigit2\" x=\"435\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٢</text>\n    <text id=\"topDigit8\" x=\"500\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٨</text>\n    <text id=\"topDigit1\" x=\"565\" y=\"188\" text-anchor=\"middle\" class=\"digit\">١</text>\n    <text id=\"topDigit3\" x=\"630\" y=\"188\" text-anchor=\"middle\" class=\"digit\">٣</text>\n  </g>\n\n  <g id=\"chart\">\n    <path class=\"arrow\" d=\"M370,207 C335,222 225,222 180,245\"/>\n    <path class=\"arrow\" d=\"M435,207 C420,222 365,225 340,245\"/>\n    <path class=\"arrow\" d=\"M500,207 L500,245\"/>\n    <path class=\"arrow\" d=\"M565,207 C580,222 635,225 660,245\"/>\n    <path class=\"arrow\" d=\"M630,207 C665,222 775,222 820,245\"/>\n\n    <g id=\"colTenThousands\">\n      <rect x=\"100\" y=\"250\" width=\"160\" height=\"70\" fill=\"#dbeafe\" class=\"cell\"/>\n      <rect x=\"100\" y=\"320\" width=\"160\" height=\"78\" fill=\"#eff6ff\" class=\"cell\"/>\n      <rect x=\"100\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"180\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">عشرات الألوف</text>\n      <text id=\"digit4\" x=\"180\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٤</text>\n      <text id=\"value40000\" x=\"180\" y=\"445\" text-anchor=\"middle\" class=\"value\">٤٠٠٠٠</text>\n    </g>\n\n    <g id=\"colThousands\">\n      <rect x=\"260\" y=\"250\" width=\"160\" height=\"70\" fill=\"#dcfce7\" class=\"cell\"/>\n      <rect x=\"260\" y=\"320\" width=\"160\" height=\"78\" fill=\"#f0fdf4\" class=\"cell\"/>\n      <rect x=\"260\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"340\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">الألوف</text>\n      <text id=\"digit2\" x=\"340\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٢</text>\n      <text id=\"value2000\" x=\"340\" y=\"445\" text-anchor=\"middle\" class=\"value\">٢٠٠٠</text>\n    </g>\n\n    <g id=\"colHundreds\">\n      <rect x=\"420\" y=\"250\" width=\"160\" height=\"70\" fill=\"#fef3c7\" class=\"cell\"/>\n      <rect x=\"420\" y=\"320\" width=\"160\" height=\"78\" fill=\"#fffbeb\" class=\"cell\"/>\n      <rect x=\"420\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"500\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">المئات</text>\n      <text id=\"digit8\" x=\"500\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٨</text>\n      <text id=\"value800\" x=\"500\" y=\"445\" text-anchor=\"middle\" class=\"value\">٨٠٠</text>\n    </g>\n\n    <g id=\"colTens\">\n      <rect x=\"580\" y=\"250\" width=\"160\" height=\"70\" fill=\"#fee2e2\" class=\"cell\"/>\n      <rect x=\"580\" y=\"320\" width=\"160\" height=\"78\" fill=\"#fef2f2\" class=\"cell\"/>\n      <rect x=\"580\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"660\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">العشرات</text>\n      <text id=\"digit1\" x=\"660\" y=\"371\" text-anchor=\"middle\" class=\"digit\">١</text>\n      <text id=\"value10\" x=\"660\" y=\"445\" text-anchor=\"middle\" class=\"value\">١٠</text>\n    </g>\n\n    <g id=\"colOnes\">\n      <rect x=\"740\" y=\"250\" width=\"160\" height=\"70\" fill=\"#ede9fe\" class=\"cell\"/>\n      <rect x=\"740\" y=\"320\" width=\"160\" height=\"78\" fill=\"#f5f3ff\" class=\"cell\"/>\n      <rect x=\"740\" y=\"398\" width=\"160\" height=\"72\" fill=\"#f8fafc\" class=\"cell\"/>\n      <text x=\"820\" y=\"286\" text-anchor=\"middle\" direction=\"rtl\" class=\"label\">الآحاد</text>\n      <text id=\"digit3\" x=\"820\" y=\"371\" text-anchor=\"middle\" class=\"digit\">٣</text>\n      <text id=\"value3\" x=\"820\" y=\"445\" text-anchor=\"middle\" class=\"value\">٣</text>\n    </g>\n  </g>\n\n  <g id=\"ruleBox\">\n    <rect x=\"160\" y=\"500\" width=\"680\" height=\"45\" rx=\"12\" fill=\"#ecfeff\" stroke=\"#0891b2\" stroke-width=\"2\"/>\n    <text x=\"500\" y=\"529\" text-anchor=\"middle\" direction=\"rtl\" class=\"small\">قاعدة سريعة: قيمة الرقم = الرقم × قيمة منزله</text>\n  </g>\n\n  <g id=\"expandedForm\">\n    <text x=\"500\" y=\"590\" text-anchor=\"middle\" direction=\"ltr\" class=\"math\">٤٢٨١٣ = ٤٠٠٠٠ + ٢٠٠٠ + ٨٠٠ + ١٠ + ٣</text>\n  </g>\n</svg>"
}