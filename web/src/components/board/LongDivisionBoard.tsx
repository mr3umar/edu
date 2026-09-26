import type { CSSProperties } from 'react';
import type { LongDivisionContent } from '../../domain';
import { layoutLongDivision, type Cell } from './longDivisionLayout';
import { localizeDigits } from './digits';
import './mathBoard.css';
import './LongDivisionBoard.css';

type Props = {
  content: LongDivisionContent;
  // Arabic uses Arabic-Indic digits, an Arabic label, and writes the quotient
  // from the dividend's first digit. The frame is the same in both: numbers
  // and the division layout read left to right.
  dir: 'rtl' | 'ltr';
};

// Long division on the board: quotient over the bar, divisor at the bracket,
// and each step's work stacked under the dividend, every part in its own
// colour. Transparent, so it sits on whatever the board is.
export default function LongDivisionBoard({ content, dir }: Props) {
  const layout = layoutLongDivision(content, { quotientAlign: dir === 'rtl' ? 'start' : 'step' });
  const n = layout.columns;
  const rtl = dir === 'rtl';

  // Laid out left to right in both languages (so digits keep their order):
  //   divisor | bracket | gutter | digits… | label
  // The gutter (column -1) holds a minus sign when a product is as wide as
  // the number above it.
  const gridColumn = (col: number) => col + 4;
  const bracketColumn = 2;
  const divisorColumn = 1;
  const labelColumn = n + 4;
  const template = `auto var(--ld-bracket) repeat(${n + 1}, var(--mb-cell)) auto`;

  const QUOTIENT_ROW = 1;
  const DIVIDEND_ROW = 2;
  const firstWorkRow = 3;

  const cell = (c: Cell, row: number, key: string) => (
    <span
      key={key}
      className={`mb-digit ld-${c.role}`}
      style={{ gridRow: row, gridColumn: gridColumn(c.col) }}
    >
      {localizeDigits(c.char, dir)}
    </span>
  );

  const dividend = layout.dividend.map(c => c.char).join('');
  const quotientSoFar = layout.quotient.map(c => c.char).join('');
  const label = `${dividend} ÷ ${layout.divisor}${quotientSoFar ? ` = ${quotientSoFar}` : ''}`;

  return (
    <div className="math-board long-division" role="img" aria-label={label}>
      <div
        className="mb-grid"
        dir="ltr"
        style={{ gridTemplateColumns: template } as CSSProperties}
      >
        {layout.quotient.map((c, i) => cell(c, QUOTIENT_ROW, `q${i}`))}

        {/* Bar over the dividend, running from the bracket to the last digit. */}
        <span
          className="ld-bar"
          style={{
            gridRow: DIVIDEND_ROW,
            gridColumn: `${bracketColumn} / ${gridColumn(n - 1) + 1}`,
          }}
        />
        <svg
          className="ld-bracket"
          style={{ gridRow: DIVIDEND_ROW, gridColumn: bracketColumn }}
          viewBox="0 0 10 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M1 0 Q 12 50 1 100" />
        </svg>
        <span className="ld-divisor" style={{ gridRow: DIVIDEND_ROW, gridColumn: divisorColumn }}>
          {localizeDigits(layout.divisor, dir)}
        </span>
        {layout.dividend.map((c, i) => cell(c, DIVIDEND_ROW, `d${i}`))}

        {layout.rows.map((row, r) => {
          const gridRow = firstWorkRow + r;
          if (row.kind === 'rule') {
            return (
              <span
                key={`r${r}`}
                className="mb-rule"
                style={{ gridRow, gridColumn: `${gridColumn(row.from)} / ${gridColumn(row.to) + 1}` }}
              />
            );
          }
          return [
            ...row.cells.map((c, i) => cell(c, gridRow, `w${r}-${i}`)),
            row.remainder && (
              <span key={`l${r}`} className="mb-label ld-remainder" style={{ gridRow, gridColumn: labelColumn }}>
                {rtl ? 'الباقي' : 'remainder'}
              </span>
            ),
          ];
        })}
      </div>
    </div>
  );
}
