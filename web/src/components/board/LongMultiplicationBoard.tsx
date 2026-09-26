import type { CSSProperties } from 'react';
import type { LongMultiplicationContent } from '../../domain';
import { localizeDigits } from './digits';
import { layoutLongMultiplication, type Cell } from './longMultiplicationLayout';
import './mathBoard.css';
import './LongMultiplicationBoard.css';

type Props = {
  content: LongMultiplicationContent;
  // Arabic uses Arabic-Indic digits. The layout is the same in both: numbers
  // and place-value columns read left to right.
  dir: 'rtl' | 'ltr';
};

// Partial-product rows cycle through these, so the shifted rows stand apart.
const PARTIAL_COLORS = 3;

// Long multiplication on the board: multiplicand over multiplier, the partial
// products shifted by place value, and their sum, each part in its own colour.
// Transparent, so it sits on whatever the board is.
export default function LongMultiplicationBoard({ content, dir }: Props) {
  const layout = layoutLongMultiplication(content);

  // Always left to right, so digits keep their order: sign gutter | digits…
  const gridColumn = (col: number) => col + 2;
  const template = `repeat(${layout.columns + 1}, var(--mb-cell))`;

  const cell = (c: Cell, row: number, key: string, partial?: number) => (
    <span
      key={key}
      className={`mb-digit lm-${c.role} ${partial !== undefined ? `lm-partial-${partial % PARTIAL_COLORS}` : ''}`}
      style={{ gridRow: row, gridColumn: gridColumn(c.col) }}
    >
      {localizeDigits(c.char, dir)}
    </span>
  );

  const label = `${layout.multiplicand} × ${layout.multiplier}${layout.result ? ` = ${layout.result}` : ''}`;

  return (
    <div className="math-board long-multiplication" role="img" aria-label={label}>
      <div className="mb-grid" dir="ltr" style={{ gridTemplateColumns: template } as CSSProperties}>
        {layout.rows.map((row, r) => {
          const gridRow = r + 1;
          if (row.kind === 'rule') {
            // Rules run under the whole block, sign gutter included.
            return <span key={`r${r}`} className="mb-rule" style={{ gridRow, gridColumn: '1 / -1' }} />;
          }
          return row.cells.map((c, i) => cell(c, gridRow, `${r}-${i}`, c.role === 'partialProduct' ? row.partial : undefined));
        })}
      </div>
    </div>
  );
}
