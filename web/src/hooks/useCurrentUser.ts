import { useEffect, useState } from 'react';
import { getCurrentUser } from '../api/auth';
import { getAuthToken, getStoredUser } from '../api/rest/token';
import type { AuthUser } from '../types/auth';

// Returns the cached user right away, then refetches it from the server so a
// page refresh always shows the latest data. `refreshing` is true until that
// first fetch settles (success or failure) — a failed fetch just keeps the
// cached user.
export function useCurrentUser(): { user: AuthUser | undefined; refreshing: boolean } {
  const [user, setUser] = useState(() => getStoredUser());
  const [refreshing, setRefreshing] = useState(() => !!getAuthToken());

  useEffect(() => {
    if (!getAuthToken()) return;

    let cancelled = false;
    getCurrentUser()
      .then(fresh => {
        if (!cancelled) setUser(fresh);
      })
      .catch(() => {
        // Keep the cached user; an expired session is handled by the http layer.
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, refreshing };
}
