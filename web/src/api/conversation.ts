import { createConversation } from './rest/services/conversations';
import { ApiError } from './rest/apiError';
import type { DocumentLang } from '../lib/useDocumentLang';

// The tutor conversation every socket message belongs to (its
// conversationUid). Created on the first message, then reused for the rest of
// the session; the tutor panel's messages live in memory too, so a reload (or
// signing out) starts a new one.
let _conversationUid: string | undefined
// Coalesces concurrent first messages into one createConversation call.
let _creating: Promise<string> | undefined
// Bumped on reset, so a creation still in flight from before doesn't become
// the new conversation.
let _generation = 0

export function getConversationUid(): string | undefined {
        return _conversationUid
}

// Resolves to the current conversation's uid, creating the conversation
// first if there isn't one yet. Throws an ApiError if it can't be created.
export function ensureConversation(language: DocumentLang): Promise<string> {
        if (_conversationUid) return Promise.resolve(_conversationUid)
        if (_creating) return _creating

        const generation = _generation
        const creating = (async () => {
                const result = await createConversation({ language }, {})
                if (result.error) {
                        throw new ApiError(result.error.code, result.error.description, undefined, result.error.missingParams as string[] | undefined)
                }
                if (generation === _generation) _conversationUid = result.data.uid
                return result.data.uid
        })().finally(() => {
                if (_creating === creating) _creating = undefined
        })
        _creating = creating
        return creating
}

// Forgets the conversation, so the next message starts a new one.
export function resetConversation(): void {
        _generation += 1
        _conversationUid = undefined
        _creating = undefined
}
