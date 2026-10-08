import type { BookM } from '../domain';
import { _socket } from '../socket';
import type { AiAgentStatus, BoardData, Message, StepId } from '../types/book';
import { markVadEvent } from '../lib/vadDiagnostics';
import { currentDocumentLang, type DocumentLang } from '../lib/useDocumentLang';

const HOST = import.meta.env.VITE_HOST;

// const pagesCache: {[key: string]: {
//         basic: PageBasic
//         full: Page
// }} = {}

// export async function getBook(id: string): Promise<BookM> {

//         const response = await fetch(`${HOST}/book/${id}`);
                
//         // 2. Check if the HTTP status code is ok (200-299)
//         if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//         }
        
//         // 3. Parse JSON data and update state
//         const result = await response.json();

//         result.pages.forEach(p => {
//                 pagesCache[p.pageNumber] = {
//                         basic: p,
//                         full: p
//                 }
//         })

//         return result

// }

// export async function getPage(id: string): Promise<Page> {

//         return pagesCache[id].full
// }

export type ShowLaserData = {wordsIds: string[]}
export type WriteOnTextbookData = {innerHtml: string, x: number, y: number, width: number, height: number, viewBox: string}

export async function showLaser(pageNumber: string | undefined, data: ShowLaserData) {
 
        if(!pageNumber) {
                pageNumber = _currentPageForLaser
        }
        if(_onLaserZonesUpdated[pageNumber]) {
                _onLaserZonesUpdated[pageNumber](data)
        }
        _laserListeners.forEach(listener => listener(data))
}

// Anyone who wants to know when the laser points somewhere (e.g. the tutor
// panel, to move out of the way). Returns the unsubscribe.
const _laserListeners = new Set<(data: ShowLaserData) => void>()
export function onLaserShown(listener: (data: ShowLaserData) => void) {
        _laserListeners.add(listener)
        return () => { _laserListeners.delete(listener) }
}
export async function goToPage(pageNumber: string) {
 
        _delegate?.goToPage(pageNumber)

}
export async function openTutorial(tutorialId: string) {
        _delegate?.openTutorial(tutorialId)
}
export async function changeTutorialStep(tutorialId: string, stepNumber: number) {
        console.log(`[delegate] changing tutorial to step ${stepNumber}`)
        _delegate?.changeTutrialStep(tutorialId, stepNumber)
}
export async function showOptions(options: {content: string}[]) {
        console.log(`[delegate] showOptions ${JSON.stringify(options)}`)
        _tutorDelegate?.showOptions(options)
}
// The closed caption for the stream being heard (undefined clears it).
export function showCaption(text: string | undefined) {
        _tutorDelegate?.showCaption(text)
}
export async function setAiAgentStatus(status: AiAgentStatus) {
        markVadEvent(`AI status: ${status}`)
        _tutorDelegate?.setAiAgentStatus(status)
}

let _onLaserZonesUpdated: {[key: string]: Function | undefined} = {}
let _currentPageForLaser = undefined
export function onLaserZonesUpdated(pageNumber: string, handler: (data: ShowLaserData) => void) {
        _onLaserZonesUpdated[pageNumber] = handler
}

let _onTeacherWritingsUpdated: {[key: string]: {
        handler: Function | undefined, writings: WriteOnTextbookData[]
}} = {}
export function onTeacherWritingsUpdated(pageNumber: string, handler: (writings: WriteOnTextbookData[]) => void) {
        _onTeacherWritingsUpdated[pageNumber] = {handler, writings: []}
}

// The board belongs to the tutor panel, which is shown across the app, so
// there's one handler rather than one per book page.
let _onBoardContentUpdated: ((content: BoardData, stepId: StepId | undefined) => void) | undefined
export function onBoardContentUpdated(handler: ((content: BoardData, stepId: StepId | undefined) => void) | undefined) {
        _onBoardContentUpdated = handler
}

// Kept in sync by BookProvider (see api/book/provider.tsx) whenever the
// active book/page changes, so plain modules outside React — sendText,
// clarifyPart, mic3.ts's websocket messages — can read the real current
// values instead of guessing. Both are undefined outside the book reader: the
// tutor can be asked from anywhere, and the messages then just omit them.
let _currentBookUid: string | undefined
let _currentPageIndex: number | undefined
export function setCurrentContext(bookUid: string | undefined, pageIndex: number | undefined) {
        _currentBookUid = bookUid
        _currentPageIndex = pageIndex
        // Left the reader: stop routing laser/writings to its last page.
        if (bookUid === undefined) _currentPageForLaser = undefined
}
export function getCurrentBookUid() {
        return _currentBookUid
}
export function getCurrentPageIndex() {
        return _currentPageIndex
}
// The language the user is seeing: the book's in the reader, the app's
// elsewhere. Sent with every message so the tutor answers in it.
export function getCurrentLanguage(): DocumentLang {
        return currentDocumentLang()
}

export async function setCurrentPageNumber(pageNumber: string) {
        _currentPageForLaser = pageNumber

        // const response = await fetch(`${HOST}/book/math-05-1/current-page/${pageNumber}`, {'method': "POST"});
                
        // const bookId = getCurrentBookId()
        // const websocket = _socket.getSocket()

        // websocket.send(JSON.stringify({
        //         event: 'json',
        //         data: JSON.stringify({
        //                 bookId,
        //                 pageNumber,
        //         })
        // }));
        
}

export async function sendText(text: string) {
        _socket.send({
                event: 'json',
                currentBookUid: _currentBookUid,
                currentPageIndex: _currentPageIndex,
                language: getCurrentLanguage(),
                data: JSON.stringify({
                        text,
                })
        });

        _tutorDelegate?.addMessage({
                type: "user",
                data: {}
        })
        
}
// Tells the backend the user cancelled the answer in progress.
export async function cancelAnswer() {
        _socket.send({
                event: 'cancel',
                currentBookUid: _currentBookUid,
                currentPageIndex: _currentPageIndex,
                language: getCurrentLanguage(),
        });
}

// Tell the backend the user paused / resumed the answer that's playing.
export async function pauseAnswer() {
        _socket.send({
                event: 'pause',
                currentBookUid: _currentBookUid,
                currentPageIndex: _currentPageIndex,
                language: getCurrentLanguage(),
        });
}

export async function resumeAnswer() {
        _socket.send({
                event: 'resume',
                currentBookUid: _currentBookUid,
                currentPageIndex: _currentPageIndex,
                language: getCurrentLanguage(),
        });
}

// What the user asks about a part of the page (from its marker's menu), as
// the message's action: explain it, solve it (a question), or show options
// for its answer (a question).
export type PartAction = 'clarify-part' | 'solve' | 'show-options'

export async function clarifyPart(partId: string, action: PartAction = 'clarify-part') {
        _socket.send({
                event: 'json',
                currentBookUid: _currentBookUid,
                currentPageIndex: _currentPageIndex,
                language: getCurrentLanguage(),
                data: JSON.stringify({
                        action,
                        partId,
                })
        });
        
        _tutorDelegate?.addMessage({
                type: "user",
                data: {}
        })
}

// A background job the backend reports progress on ('ai-task'), e.g.
// task 'page-analysis' for the page at `pageIndex` (its index in book.pages).
// ('stopped' is set here, when the user stops a task; the backend reports
// the other three.)
export type AiTask = {
        task: string
        pageIndex?: number
        status: 'started' | 'completed' | 'failed' | 'stopped'
}

// Set by the book reader while it's open; book-only actions do nothing elsewhere.
export type BooksDelegate = {
        goToPage: (pageNumber: string) => void
        openTutorial: (tutorialId: string) => void
        changeTutrialStep: (tutorialId: string, stepNumber: number) => void
        onAiTask: (task: AiTask) => void
}

// Goes to the open book (e.g. a page's scan) and to the tutor panel's task list.
export function handleAiTask(task: AiTask) {
        _delegate?.onAiTask(task)
        _tutorDelegate?.onAiTask(task)
}

// The user stopped a running task: tell the backend, and stop it here now
// rather than waiting to hear back.
export function stopAiTask(task: AiTask) {
        _socket.send({
                event: 'stop-task',
                task: task.task,
                pageIndex: task.pageIndex,
                currentBookUid: _currentBookUid,
                currentPageIndex: _currentPageIndex,
                language: getCurrentLanguage(),
        })
        handleAiTask({ ...task, status: 'stopped' })
}
let _delegate: BooksDelegate | undefined
export async function setBooksDelegate(delegate: BooksDelegate | undefined) {
        _delegate = delegate
}

// Set by TutorProvider (see api/tutor/provider.tsx), which lives for the whole app.
export type TutorDelegate = {
        showOptions: (options: {content: string}[]) => void
        showCaption: (text: string | undefined) => void
        setAiAgentStatus: (status: AiAgentStatus) => void,
        addMessage: (msg: Message<any>) => void,
        onAiTask: (task: AiTask) => void,
}
let _tutorDelegate: TutorDelegate | undefined
export function setTutorDelegate(delegate: TutorDelegate | undefined) {
        _tutorDelegate = delegate
}


export async function writeOnTextbook(pageNumber: string | undefined, data: WriteOnTextbookData) {
 
        if(!pageNumber) {
                pageNumber = _currentPageForLaser
        }
        if(_onTeacherWritingsUpdated[pageNumber]) {
                _onTeacherWritingsUpdated[pageNumber].writings.push(data)
                _onTeacherWritingsUpdated[pageNumber].handler(_onTeacherWritingsUpdated[pageNumber].writings)
        }
}
// `stepId`: the lesson step the board belongs to, if any.
export async function writeOnBoard(data: BoardData, stepId?: StepId) {
        _onBoardContentUpdated?.(data, stepId)
}

// The lesson step a message is about, added to every socket message:
// 1. the step the user interrupted by voice: captured when their speech
//    started (playback then pauses) and kept for the whole utterance;
// 2. the step of the stream playing right now (not paused), so text typed
//    over it carries it too;
// 3. the step of the board on screen.
// Undefined when none applies.
let _boardStepId: StepId | undefined
let _interruptedStepId: StepId | undefined
let _playingStepId: (() => StepId | undefined) | undefined

// Kept in sync by TutorProvider: the step of the board on screen, while it's open.
export function setCurrentStepId(stepId: StepId | undefined) {
        _boardStepId = stepId
}
// Set by mic3.ts for the length of a spoken interruption.
export function setInterruptedStepId(stepId: StepId | undefined) {
        _interruptedStepId = stepId
}
// Registered by mic3.ts: the step of the stream that's audible now, if any.
export function setPlayingStepIdSource(source: (() => StepId | undefined) | undefined) {
        _playingStepId = source
}
export function getCurrentStepId(): StepId | undefined {
        return _interruptedStepId ?? _playingStepId?.() ?? _boardStepId
}