import { AgentLine } from "./text-openai-lines.js"

export type VoiceDelegate = {
        getPageContent: (pageNumber: string) => Promise<any>
        getTutorialJob: (tutorialId: string) => TutorialJob | undefined
        updateTutorialJobStatus: (tutorialId: string, status: TutorialJob["status"]) => void
        startTutorial: (tutorialId: string, tutorialDesc: string) => Promise<any>
        startTutorialFromTextBook: (bookId: string, tutorialId: string, tutorialDesc: string, partId: string) => Promise<any>
        showTutorialStep: (conceptId: string, score: number) => void
        showLaser: (wordsIds: string) => void
        goToPage: (wordsIds: string) => void
        updateAssessmentScore: (conceptId: string, score: number) => void
        writeOnBook: (svgCode: string) => void
        writeOnBoard: (html: string) => void
        openTutorial: (tutorialId: string) => void
        changeTutorialStep: (tutorialId: string, stepNumber: number) => void
        showOptions: (options: {content: string}[]) => void
}

export type TextDelegate = {
        onMessage: (msg: {type: string, data?: {content: string} | null, turnComplete: boolean}) => void
        callTool: (msg: {name: string, args?: any}) => Promise<any>
        recordUsage: RecordUsage
}

export type RecordUsage = (cost: number, usage: {type: 'tokens' | 'per-audio' | 'per-charachter', tokens?: {input: number, output: number}, charactersCount?: number, audioMin?: number, info?: string}) => Promise<void>
export type LinesDelegate = {
        onMessage: (index: number, stepId: string, lang: string, lineToSay: string, htmlForBoard: AgentLine["boardContent"] | null, abortSignal: AbortSignal) => Promise<void>
        onCompleted: () => Promise<void>
        callTool: (msg: {name: string, args?: any}) => Promise<any>
        recordUsage: RecordUsage
}


export type TutorialJob = {
        tutorialId: string;
        status: 'running' | 'completed'
      }


export type OCRSpaceResponse = {
        "ParsedResults" : [],
        /**
         * 	The exit code shows if OCR completed successfully, partially or failed with error

                1: Parsed Successfully (Image / All pages parsed successfully)
                2: Parsed Partially (Only few pages out of all the pages parsed successfully)
                3: Image / All the PDF pages failed parsing (This happens mainly because the OCR engine fails to parse an image)
                4: Error occurred when attempting to parse (This happens when a fatal error occurs during parsing )
         */
        "OCRExitCode" : "1" | "2" | "3" | "4", 
        /**
         * If an error occurs when parsing the Image / PDF pages
         */
        "IsErroredOnProcessing" : false,
        "ErrorMessage" : null,
        "ErrorDetails" : null
        "SearchablePDFURL": string
        "ProcessingTimeInMilliseconds" : number,
        /**
         * The exit code returned by the parsing engine
                0: File not found
                1: Success
                -10: OCR Engine Parse Error
                -20: Timeout
                -30: Validation Error
                -99: Unknown Error
         */
        "FileParseExitCode"?: 0 | 1 | -10 | -20 | -30 | 99
        /**
         * The parsed text for an image
         */
        "ParsedText": string,
        /**
         * This contains an array of all the lines. Each line will contain an array of words
         */
        "Lines": any[]
    }