import type { LongDivisionContent } from '../../domain';
import { asciiDigits } from './digits';

// Lays out a long division for the board, in the standard school form:
// quotient above the bar, divisor beside the bracket, and each step's
// product, difference and brought-down digit stacked under the dividend.
//
// The server sends the division as the ordered list of parts written so far
// (dividend, divisor, then per step: quotient digit, product, difference,
// brought-down digit). Parts carry no columns, so those are worked out here: the first step ends at
// the shortest leading part of the dividend that gives its quotient digit, and
// each brought-down digit moves one column right.

// What a digit is in the division, for colour-coding it the way it's taught.
export type Role = 'dividend' | 'quotient' | 'product' | 'difference' | 'bringDown' | 'minus';

// `col` counts dividend digits from the left (0 = first digit). -1 is the
// gutter before the dividend, where a minus sign can sit.
export type Cell = { col: number; char: string; role: Role };

export type DigitsRow = { kind: 'digits'; cells: Cell[]; remainder?: boolean };
export type RuleRow = { kind: 'rule'; from: number; to: number };
export type Row = DigitsRow | RuleRow;

export type LongDivisionLayout = {
  // Number of dividend digits (columns 0..columns-1).
  columns: number;
  dividend: Cell[];
  divisor: string;
  quotient: Cell[];
  rows: Row[];
  // Every step has been done and nothing is left to bring down.
  finished: boolean;
};

type Step = {
  quotientDigit?: string;
  product?: string;
  difference?: string;
  bringDown?: string;
};

const MINUS = '−';

// Reads the parts list into the dividend, divisor and steps written so far.
function readParts(content: LongDivisionContent) {
  let dividend = '';
  let divisor = '';
  let quotient = '';
  const steps: Step[] = [];

  // Product, difference and brought-down digit go to the earliest step still
  // missing one: the quotient can arrive whole ("49") before any products, and
  // then the steps already exist. With none missing, a new step has started
  // without its quotient digit being sent first.
  const stepFor = (field: keyof Step) => {
    const open = steps.find(step => step[field] === undefined);
    if (open) return open;
    const step: Step = {};
    steps.push(step);
    return step;
  };

  for (const part of content.parts ?? []) {
    const value = asciiDigits(part.value);
    switch (part.type) {
      case 'dividend': dividend = value; break;
      case 'divisor': divisor = value; break;
      case 'quotient': {
        // Either the quotient so far ("20" after "2") or just the next digit ("0").
        const added = value.length > quotient.length && value.startsWith(quotient)
          ? value.slice(quotient.length)
          : value;
        for (const digit of added) {
          const last = steps[steps.length - 1];
          // A step can have started (product first) before its digit arrived.
          if (last && last.quotientDigit === undefined) last.quotientDigit = digit;
          else steps.push({ quotientDigit: digit });
        }
        quotient += added;
        break;
      }
      case 'product': stepFor('product').product = value; break;
      case 'difference': stepFor('difference').difference = value; break;
      case 'bringDown': stepFor('bringDown').bringDown = value; break;
    }
  }

  return { dividend, divisor, steps };
}

// Column where the first step ends: the shortest leading part of the dividend
// whose quotient is the step's digit (or, before any digit, that's at least
// the divisor). Covers both the standard start (1254 ÷ 6 starts at "12") and
// digit-by-digit with a leading 0 (starts at "1").
function firstStepEnd(dividend: string, divisor: string, first: Step | undefined): number {
  const d = BigInt(divisor);
  const digit = first?.quotientDigit !== undefined ? BigInt(first.quotientDigit) : undefined;
  let prefix = 0n;
  for (let i = 0; i < dividend.length; i++) {
    prefix = prefix * 10n + BigInt(dividend[i]);
    if (digit !== undefined ? prefix / d === digit : prefix >= d) return i;
  }
  return dividend.length - 1;
}

// Digits of `text` placed so its last digit sits in `endCol`.
const alignRight = (text: string, endCol: number, role: Role): Cell[] =>
  [...text].map((char, k) => ({ col: endCol - text.length + 1 + k, char, role }));

export type LayoutOptions = {
  // Where quotient digits go: over the dividend digit each step ends on (the
  // US convention), or from the dividend's first digit, one per column (as in
  // Arabic textbooks).
  quotientAlign: 'step' | 'start';
};

export function layoutLongDivision(
  content: LongDivisionContent,
  { quotientAlign }: LayoutOptions = { quotientAlign: 'step' },
): LongDivisionLayout {
  const { dividend, divisor, steps } = readParts(content);

  const layout: LongDivisionLayout = {
    columns: dividend.length,
    dividend: [...dividend].map((char, col) => ({ col, char, role: 'dividend' })),
    divisor,
    quotient: [],
    rows: [],
    finished: false,
  };
  if (!dividend || !divisor || /^0+$/.test(divisor) || steps.length === 0) return layout;

  const firstEnd = firstStepEnd(dividend, divisor, steps[0]);
  const endColOf = (index: number) => Math.min(firstEnd + index, dividend.length - 1);

  const lastIndex = steps.length - 1;
  const lastColumn = dividend.length - 1;
  // Done when the last step reaches the final dividend digit and has its
  // difference: that difference is the remainder.
  layout.finished = endColOf(lastIndex) === lastColumn && steps[lastIndex].difference !== undefined;

  steps.forEach((step, index) => {
    const endCol = endColOf(index);

    if (step.quotientDigit !== undefined) {
      const col = quotientAlign === 'start' ? layout.quotient.length : endCol;
      layout.quotient.push({ col, char: step.quotientDigit, role: 'quotient' });
    }

    if (step.product !== undefined) {
      const minusCol = endCol - step.product.length;
      layout.rows.push({
        kind: 'digits',
        cells: [{ col: minusCol, char: MINUS, role: 'minus' }, ...alignRight(step.product, endCol, 'product')],
      });
      if (step.difference !== undefined) layout.rows.push({ kind: 'rule', from: minusCol, to: endCol });
    }

    if (step.difference !== undefined) {
      const cells = alignRight(step.difference, endCol, 'difference');
      if (step.bringDown !== undefined) cells.push({ col: endCol + 1, char: step.bringDown, role: 'bringDown' });
      layout.rows.push({ kind: 'digits', cells, remainder: layout.finished && index === lastIndex });
    }
  });

  return layout;
}
