import * as fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';

const pdfFileName = `math-05-1`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfFilePath = path.join(__dirname, '../books/', pdfFileName) + '.pdf';
const imagesPath = path.join(__dirname, '../books/images/', pdfFileName);
const jsonFilePath = path.join(__dirname, '../books/json/', pdfFileName);

export const getTopicPages = () => {

        const content = fs.readFileSync(`${jsonFilePath}/12.json`, 'utf-8')
        const json = JSON.parse(content)

        for(const part of json.parts) {
                // part.content = part.content2
                delete part.content2


                part.coordinates = part.pixel_coordinates
                delete part.pixel_coordinates
        }

        for(const word of json.words) {
                word.x = word.pixel_coordinates.x
                word.y = word.pixel_coordinates.y
                delete word.pixel_coordinates
        }


        return {
                pages: [json]
        }
}