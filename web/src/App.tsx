import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomeView from './pages/HomeView';
import BookReaderView from './pages/BookReaderView';
import AuthView from './pages/AuthView';
import ResetPasswordView from './pages/ResetPasswordView';
import ProfileView from './pages/ProfileView';
import ProfileEditView from './pages/ProfileEditView';
import ChangePasswordView from './pages/ChangePasswordView';
import { startSocket } from './socket';
import { startLiveConversation } from './mic';
import { startLiveConversationVad } from './mic3';
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Mic } from './types/book';
import type { PlaybackState } from './audioStreamPlayer';
import { TutorProvider } from './api/tutor/provider';
import Panel from './components/Panel';

type AppContextType = {
  mic: Mic;
  micStatus: boolean;
  playingStatus: boolean;
  playback: PlaybackState;
};

const INITIAL_PLAYBACK: PlaybackState = { active: false, paused: false, rate: 1, hasPrevious: false, hasNext: false, pending: false };

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mic, setMic] = useState(undefined);
  const [micStatus, setMicStatus] = useState(false);
  const [playingStatus, setPlayingStatus] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>(INITIAL_PLAYBACK);


  try {
    const socket = startSocket()
    // startLiveConversation(socket)
    void startLiveConversationVad(socket)
    .then((r: Mic) => {
      r.setDelegate({
        onMicStatusChanged: value => {
          setMicStatus(value)
        },
        onPlayingStatusChanged: value => {
          setPlayingStatus(value)
        },
        onPlaybackStateChanged: value => {
          setPlayback(value)
        },
      })
      MIC = r
      setMic(r)
    })
    .catch(console.error)
  }
  catch(err) {
    console.error(err)
  }
  
  return (
    <AppContext.Provider value={{ mic, micStatus, playingStatus, playback }}>
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}

export let MIC: Mic | undefined = undefined

export default function App() {


  return (
    <TutorProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/auth" element={<AuthView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
        <Route path="/profile" element={<ProfileView />} />
        <Route path="/profile/edit" element={<ProfileEditView />} />
        <Route path="/profile/change-password" element={<ChangePasswordView />} />
        <Route path="/book/:bookId/:page?" element={<BookReaderView />} />
      </Routes>
      <TutorPanel />
    </BrowserRouter>
    </TutorProvider>
  );
}

// Pages without a signed-in user, where there's no tutor to talk to.
const NO_TUTOR_PATHS = ['/auth', '/reset-password'];

// Room left at the end of scrolling pages so the fixed panel (60px tall,
// 8px off the bottom) doesn't cover their last content.
const PANEL_CLEARANCE_PX = 84;

// The AI tutor panel, shown on every page so the user can ask from anywhere.
function TutorPanel() {
  const { pathname } = useLocation();
  if (NO_TUTOR_PATHS.includes(pathname)) return null;

  // The reader is a full-screen layout the panel floats over by design.
  const inReader = pathname.startsWith('/book/');

  return (
    <>
      {!inReader && <div aria-hidden="true" style={{ height: PANEL_CLEARANCE_PX }} />}
      <Panel />
    </>
  );
}