import type { LongMultiplicationContent } from '../../domain';
import { asciiDigits } from './digits';

// Lays out a long multiplication for the board, in the standard school form:
//
//        4 5 6     multiplicand
//      ×   2 3     multiplier
//      -------
//      1 3 6 8     partial product for the ones digit (456 × 3)
//    + 9 1 2       partial product for the tens digit, one place left
//    ---------
//    1 0 4 8 8     sum
//
// The server sends the parts written so far, in order. Everything is right-
// aligned by place value; the only thing to work out is how far to shift each
// partial product (see partialShift).

export type Role = 'multiplicand' | 'multiplier' | 'partialProduct' | 'sum' | 'sign';

// `col` counts digit columns from the left (0 = the leftmost place value in
// the whole layout). -1 is the gutter for the × and + signs.
export type Cell = { col: number; char: string; role: Role };

// `partial` numbers the partial-product rows (0 = ones digit), so each can
// take its own colour.
export type DigitsRow = { kind: 'digits'; cells: Cell[]; partial?: number };
export type RuleRow = { kind: 'rule' };
export type Row = DigitsRow | RuleRow;

export type LongMultiplicationLayout = {
  // Number of digit columns (0..columns-1).
  columns: number;
  rows: Row[];
  // For the screen-reader label.
  multiplicand: string;
  multiplier: string;
  result: string;
};

// For comparing values: "05" and "5" are the same number.
const numeric = (digits: string) => digits.replace(/^0+(?=\d)/, '');

// How many places the k-th partial product (k = 0 for the multiplier's ones
// digit) moves left. Schools write it either with the place-holder zeros
// ("9120") or without them, shifted ("912"); multiplying it out tells which.
// If it matches neither (the server did something else), trailing zeros are
// taken to mean they're included.
function partialShift(value: string, k: number, multiplicand: string, multiplier: string): number {
  if (k === 0) return 0;
  const digit = multiplier[multiplier.length - 1 - k];
  if (multiplicand && digit !== undefined) {
    const expected = BigInt(multiplicand) * BigInt(digit);
    const actual = BigInt(value);
    if (actual === expected) return k;
    if (actual === expected * 10n ** BigInt(k)) return 0;
  }
  return value.endsWith('0'.repeat(k)) ? 0 : k;
}

export function layoutLongMultiplication(content: LongMultiplicationContent): LongMultiplicationLayout {
  let multiplicand = '';
  let multiplier = '';
  let sum = '';
  const partials: string[] = [];

  for (const part of content.parts ?? []) {
    const value = asciiDigits(part.value);
    if (!value) continue;
    switch (part.type) {
      case 'multiplicand': multiplicand = value; break;
      case 'multiplier': multiplier = value; break;
      case 'partialProduct': partials.push(value); break;
      case 'sum': sum = value; break;
    }
  }

  const shifts = partials.map((value, k) => partialShift(value, k, multiplicand, multiplier));

  // Wide enough for every number at its place value.
  const columns = Math.max(
    multiplicand.length,
    multiplier.length,
    sum.length,
    ...partials.map((value, k) => value.length + shifts[k]),
    1,
  );

  // Digits of `text` right-aligned, `shift` places in from the ones column.
  const place = (text: string, role: Role, shift = 0): Cell[] =>
    [...text].map((char, i) => ({ col: columns - shift - text.length + i, char, role }));

  const rows: Row[] = [];
  if (multiplicand) rows.push({ kind: 'digits', cells: place(multiplicand, 'multiplicand') });
  if (multiplier) {
    rows.push({ kind: 'digits', cells: [{ col: -1, char: '×', role: 'sign' }, ...place(multiplier, 'multiplier')] });
    rows.push({ kind: 'rule' });
  }

  // One-digit multiplier: the only partial product is the answer. If it also
  // comes as the sum, show it once, as the sum.
  const shownPartials = partials.length === 1 && numeric(partials[0]) === numeric(sum) ? [] : partials;

  shownPartials.forEach((value, k) => {
    // The + goes on the last partial product, when there's more than one to add.
    const isLastOfSeveral = shownPartials.length > 1 && k === shownPartials.length - 1;
    const sign: Cell[] = isLastOfSeveral ? [{ col: -1, char: '+', role: 'sign' }] : [];
    rows.push({ kind: 'digits', cells: [...sign, ...place(value, 'partialProduct', shifts[k])], partial: k });
  });

  if (sum) {
    // Partial products above it are added up, under a rule of their own;
    // otherwise the rule under the multiplier is enough.
    if (shownPartials.length > 0) rows.push({ kind: 'rule' });
    rows.push({ kind: 'digits', cells: place(sum, 'sum') });
  }

  return {
    columns,
    rows,
    multiplicand,
    multiplier,
    // Without a sum, a lone partial product is the answer only for a
    // one-digit multiplier; otherwise the work isn't finished yet.
    result: sum || (multiplier.length === 1 && partials.length === 1 ? partials[0] : ''),
  };
}
