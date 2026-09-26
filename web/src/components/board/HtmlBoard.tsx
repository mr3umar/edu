import { useMemo } from 'react';
import './HtmlBoard.css';

// The app's web fonts, as loaded in index.html, so board text matches the app.
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

// The board's starting point inside the frame; the HTML's own styles build on it.
// - transparent, and light colour-scheme on both sides of the frame: a
//   mismatch makes browsers paint the frame opaque
// - the body is what gets measured for fitting: flow-root keeps its
//   children's margins inside it, and nothing scrolls
const BASE_CSS = `
:root { color-scheme: light; }
html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
body {
  display: flow-root;
  color: #1a1a1a;
  font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
  line-height: 1.5;
}
html[dir='rtl'] body { font-family: 'Noto Sans Arabic', 'Plus Jakarta Sans', ui-sans-serif, sans-serif; }
`;

// An HTML whiteboard, isolated in a sandboxed frame: its styles can't reach
// the app (nor the app's reach it), and with no `allow-scripts` nothing in it
// runs, inline event handlers included. `allow-same-origin` (safe without
// scripts) lets the panel read the frame to fit it to the board; see
// fitFrameToBox.
export default function HtmlBoard({ html, dir }: { html: string; dir: 'rtl' | 'ltr' }) {
  const srcDoc = useMemo(
    // translate="no": board content (numbers, maths) shouldn't be machine-
    // translated, and it keeps the browser's translator from trying to run its
    // script in the sandboxed frame.
    () => `<!doctype html><html dir="${dir}" translate="no"><head><meta charset="utf-8">`
      + `<link rel="stylesheet" href="${FONTS_URL}"><style>${BASE_CSS}</style></head>`
      + `<body>${html}</body></html>`,
    [html, dir],
  );

  return (
    <iframe
      className="html-board"
      data-board-frame=""
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      title={dir === 'rtl' ? 'السبورة' : 'Whiteboard'}
    />
  );
}
