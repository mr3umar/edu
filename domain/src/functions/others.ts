
  export const calculateEstimatedToken = (messages: {content?: string | {}| null}[]) => {

    const estimatedTokens = Math.ceil(
        JSON.stringify(messages).length / 3.5
    );

    return estimatedTokens;
  }


  export function hasLettersOrNumbers(text: string) {
      return /[\p{L}\p{N}]/u.test(text);
    }
  
  

let TEACH_REQ = 0
export const generateReqId = () => String(++TEACH_REQ) 



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

export function removeTashkeel(text: string): string {
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

// Keeps internal vowels & shadda (they disambiguate); drops redundant marks.
// Case endings (i'rab), which gives the natural pausal reading. Pass dropCaseEndings = false for Quranic or grammar-teaching text, where the endings matter.
export function simplifyTashkeel(text: string, dropCaseEndings = true): string {
  let t = text.normalize('NFC').replace(/\u0640/g, '');   // tatweel ـ

  t = t.replace(/\u0652/g, '')                            // sukun (implied)
       .replace(/\u064E(?=[اى])/g, '')                    // fatha before alif  (ـَا)
       .replace(/\u0650(?=ي(?![\u064B-\u0651]))/g, '')    // kasra before long ī (ـِي)
       .replace(/\u064F(?=و(?![\u064B-\u0651]))/g, '');   // damma before long ū (ـُو)

  if (dropCaseEndings) {
    const END = '\\u0651?(?:[\\s\\p{P}]|$)';              // word end, keep shadda
    t = t.replace(new RegExp(`\\u064B(?=[اى](?:[\\s\\p{P}]|$))`, 'gu'), '') // ـًا
         .replace(new RegExp(`[\\u064B-\\u0650](?=${END})`, 'gu'), '');   // final vowel/tanween
  }
  return t;
}

