// Digit handling shared by the whiteboard's arithmetic boards.

// Arabic-Indic and Persian digits → ASCII, other characters dropped, so the
// server can send either. Numbers are accepted as-is (0 included).
export function asciiDigits(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '');
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// Digits as they're written in the board's language: Arabic-Indic in Arabic.
export function localizeDigits(text: string, dir: 'rtl' | 'ltr'): string {
  return dir === 'rtl' ? text.replace(/\d/g, d => ARABIC_DIGITS[Number(d)]) : text;
}
