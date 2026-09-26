import type { BoardData } from '../../types/book';
import HtmlBoard from './HtmlBoard';
import LongDivisionBoard from './LongDivisionBoard';
import LongMultiplicationBoard from './LongMultiplicationBoard';

// Draws whatever the tutor put on the whiteboard, by its type.
export default function BoardView({ board, dir }: { board: BoardData | undefined; dir: 'rtl' | 'ltr' }) {
  if (!board) return null;

  switch (board.type) {
    case 'html':
      return <HtmlBoard html={board.content.html} dir={dir} />;
    case 'longDivision':
      return <LongDivisionBoard content={board.content} dir={dir} />;
    case 'longMultiplication':
      return <LongMultiplicationBoard content={board.content} dir={dir} />;
  }
}
