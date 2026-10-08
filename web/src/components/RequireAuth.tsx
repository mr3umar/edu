import { useSyncExternalStore } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasSession, subscribeSession } from '../api/rest/token';

// Where AuthView sends the user back to once they've signed in.
export type AuthRedirectState = { from?: string };

// Pages that need a signed-in user. Without a session, the user goes to sign
// in, and comes back here afterwards. Also when the session ends while they're
// on the page (it expired and couldn't be renewed), not only on arrival.
export default function RequireAuth() {
  const signedIn = useSyncExternalStore(subscribeSession, hasSession);
  const location = useLocation();

  if (!signedIn) {
    const state: AuthRedirectState = { from: location.pathname + location.search };
    return <Navigate to="/auth" replace state={state} />;
  }
  return <Outlet />;
}
