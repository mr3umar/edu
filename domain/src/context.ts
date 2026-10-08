import OpenAI from 'openai';
import { BookE } from './entities/Book.js';
import { PageAnalysisE } from './entities/PageAnalysis.js';
import { ExcelBook, Scope, ServiceDef, ServiceResult } from './types.js';
import WebSocket from 'ws';

export namespace Context {
    export type GetEnvTarget = (scope: Scope) => 'PROD' | 'TEST' | 'DEV';
    export type GetUserId = (scope: Scope) => Promise<string | undefined>;
    export type GetClientIamId = (scope: any) => Promise<string>
    export type GetClientUserId = (scope: any) => Promise<string>
    export type getClientLanguage = (scope: any) => Promise<string>
    export type GetSource = (scope: any) => Promise<string | undefined>

    export type Encrypt = (scope: any, data: Record<string, any>, options: { expiresIn?: number }) => Promise<string>; // expiresIn in seconds
    export type Decrypt = <T>(scope: any, token: string) => Promise<{ data?: T; expired: boolean }>;
    export type CacheRepo = {
        set: (scope: Scope, key: string, value: any, ttl: number) => Promise<void>; // ttl: milliseconds
        get: <T>(scope: Scope, key: string) => Promise<T>;
    };
    export type CreateExcelWorkbook = (scope: any) => ExcelBook
    export type GetIAMInstanceId = (scope: any) => Promise<string>;
    export type CallService = (scope: any, instanceId: string, serviceName: string, params: ServiceDef["Params"]) => Promise<ServiceResult<ServiceDef>>;
    
    export type AppendFile = (scope: any, type: "pdf" | 'conv-uploaded-image', fileId: string, fileName: string, fileSize: number, isCompleted: boolean, chunkIndex?: number, data?: Buffer) => Promise<void>
    export type PdfToImages = (scope: any, fileId: string) => Promise<void>
    export type extractText = (scope: any, bookUid: string, pageIndex: number) => Promise<string>
    export type generateBookStructure = (scope: any, pageText: string[]) => Promise<{
        language: BookE["data"]["language"],
        bookTitle: string,
        sections: {sectionIndex: number; title: string}[]
        pages: {pageIndex: number; sectionIndex: number}[]
    }>
    export type analyzePage = (scope: any, bookUid: string, pageIndex: number, pageWidth: number, pageHight: number) => Promise<{
        parts: PageAnalysisE["data"]["parts"],
        words: PageAnalysisE["data"]["words"],
        
    }>
    export type sendToClient = (scope: any, data: Record<string, any>) => Promise<void>
    export type getOpenaiSession = (scope: any) => Promise<OpenAI>
    // export type getGrokSession = (scope: any) => Promise<WebSocket>
    // export type getTaskAbortContoller = (scope: any, taskUid: string) => Promise<AbortController | undefined>
    export type getPageImageBase64 = (scope: any, bookUid: string, pageIndex: number) => Promise<string>
    export type startTask = (scope: any, taskUid: string) => Promise<void>
    export type cancelTask = (scope: any, taskUid: string) => Promise<void>
    export type pauseTaskGroup = (scope: any, taskGroupUid: string) => Promise<void>
    export type resumeTaskGroup = (scope: any, taskGroupUid: string) => Promise<void>
    export type getTaskAbortContoller = (scope: any, taskUid: string) => Promise<AbortController>


}
