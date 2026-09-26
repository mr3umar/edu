import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { AppProvider } from './App';
import './styles.css';
import { getAppLang, setAppLang } from './lib/appLanguage';

// Start in the session language saved from last time (Arabic by default).
setAppLang(getAppLang());

// Hold the first render until the web fonts are ready so text doesn't paint in
// a fallback font and then visibly swap. The timeout keeps a slow or blocked
// font request from delaying the app for long.
const FONT_WAIT_MS = 1500;
const FONTS = [
  '400 1em "Noto Sans Arabic"',
  '500 1em "Noto Sans Arabic"',
  '600 1em "Noto Sans Arabic"',
  '700 1em "Noto Sans Arabic"',
  '400 1em "Plus Jakarta Sans"',
  '500 1em "Plus Jakarta Sans"',
  '600 1em "Plus Jakarta Sans"',
  '700 1em "Plus Jakarta Sans"',
];

function waitForFonts(): Promise<unknown> {
  if (!document.fonts?.load) return Promise.resolve();
  const loaded = Promise.all(FONTS.map(font => document.fonts.load(font, 'aبc'))).catch(() => {});
  const timeout = new Promise(resolve => setTimeout(resolve, FONT_WAIT_MS));
  return Promise.race([loaded, timeout]);
}

waitForFonts().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProvider>
      <App />
      </AppProvider>
    </React.StrictMode>
  );
});
