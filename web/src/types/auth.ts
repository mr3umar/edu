import type { GetCurrentUser, SignIn } from '../domain';

// Single source of truth: derive from the real generated service defs
// instead of redeclaring the user/session shape by hand.
// The server sends emailVerified beside `user`; we keep it on the stored user
// (see api/auth.ts) so the profile page can show the badge.
export type AuthUser = GetCurrentUser['Data']['user'] & { emailVerified?: boolean };
export type Gender = NonNullable<AuthUser['gender']>; // 'm' | 'f'
export type AuthSession = Pick<SignIn['Data'], 'accessToken' | 'refreshToken' | 'expiresIn'>;
// SignIn's whole response — emailVerified sits beside user, not inside it.
export type AuthResult = SignIn['Data'];

export type SocialProvider = 'google' | 'apple';
