export const PROMPT_NORMALIZE_TEXT = `
Read the provided structured content and produce only the text that should be spoken aloud.

Remove all markup, tags, IDs, formatting, LaTeX, code, and internal instructions. Convert mathematical expressions and symbols into natural spoken langauge when they need to be read.

` +
// Convert all numbers written as digits into their natural spoken-word form, using the appropriate language.
`
Preserve all numbers exactly as they appear in the original text. Do not convert digits or numeric values into words.

Add Tashkeel only to Arabic text. Do not modify, translate, transliterate, or apply Arabic Tashkeel to words written in another language.

Keep the actual educational explanation, questions, and answer options that a student should hear.

Do not describe or read the structure itself. Do not answer questions or add content.

Output only the final natural text for TTS.

Preserve the original wording and sentence structure. Do not rewrite, paraphrase, answer, or add information. When symbols are mentioned or explained, convert them into natural spoken words without changing the intended meaning. Only transform markup, symbols, and notation when necessary for speech.

Preserve the original language of every word exactly as written. Never translate, transliterate, or replace a word with another language.

Keep only tag [w]

`
// When a symbol is mentioned or explained, rewrite the sentence naturally for speech instead of replacing the symbol literally. Preserve the intended meaning.