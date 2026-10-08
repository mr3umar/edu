import { createRestService } from './rest/createRestService';
import { ApiError } from './rest/apiError';
import { resetConversation } from './conversation';
import { saveSession, saveAccessToken, getStoredUser, setStoredUser, clearSession } from './rest/token';
import type {
  ServiceDef,
  ServiceResult,
  SignIn,
  SignUp,
  SendEmailOtp,
  VerifyEmailOtp,
  RefreshAccessToken,
  SendResetPassword,
  ResetPassword,
  ChangePassword,
  UpdateMyInfo,
  GetCurrentUser,
} from '../domain';
import type { AuthResult, AuthUser, Gender, SocialProvider } from '../types/auth';

// domain.d.ts types UpdateMyInfo's `name` param as the gender enum, which
// only makes sense as a generator typo (compare UpdateUser: same bug) — using
// the evidently-intended shape here instead of propagating it.
type UpdateMyInfoFixed = Omit<UpdateMyInfo, 'Params'> & {
  Params: { name?: string; gender?: Gender; birthdate?: string; preferedLang?: 'ar' | 'en' };
};

const signInService = createRestService<SignIn>('signIn', params => ({
  method: 'POST',
  path: '/api/signIn',
  body: { params },
}));
const signUpService = createRestService<SignUp>('signUp', params => ({
  method: 'POST',
  path: '/api/signUp',
  body: { params },
}));
const sendEmailOtpService = createRestService<SendEmailOtp>('sendEmailOtp', params => ({
  method: 'POST',
  path: '/api/sendEmailOtp',
  body: { params },
}));
const verifyEmailOtpService = createRestService<VerifyEmailOtp>('verifyEmailOtp', params => ({
  method: 'POST',
  path: '/api/verifyEmailOtp',
  body: { params },
}));
const refreshAccessTokenService = createRestService<RefreshAccessToken>('refreshAccessToken', params => ({
  method: 'POST',
  path: '/api/refreshAccessToken',
  body: { params },
}));
const sendResetPasswordService = createRestService<SendResetPassword>('sendResetPassword', params => ({
  method: 'POST',
  path: '/api/sendResetPassword',
  body: { params },
}));
const resetPasswordService = createRestService<ResetPassword>('resetPassword', params => ({
  method: 'POST',
  path: '/api/resetPassword',
  body: { params },
}));
const changePasswordService = createRestService<ChangePassword>('changePassword', params => ({
  method: 'POST',
  path: '/api/changePassword',
  body: { params },
}));
const getCurrentUserService = createRestService<GetCurrentUser>('getCurrentUser', params => ({
  method: 'POST',
  path: '/api/getCurrentUser',
  body: { params },
}));
const updateMyInfoService = createRestService<UpdateMyInfoFixed>('updateMyInfo', params => ({
  method: 'POST',
  path: '/api/updateMyInfo',
  body: { params },
}));

// Unwraps a ServiceResult into its Data, throwing the real ApiError (with the
// service's own error code, not a generic one) on failure.
async function unwrap<TDef extends ServiceDef>(promise: Promise<ServiceResult<TDef>>): Promise<TDef['Data']> {
  const result = await promise;
  if (result.error) {
    throw new ApiError(result.error.code, result.error.description, undefined, result.error.missingParams as string[] | undefined);
  }
  return result.data;
}

function persist(result: AuthResult): AuthResult {
  saveSession({ ...result, user: { ...result.user, emailVerified: result.emailVerified } });
  return result;
}

// SignUp only creates the account — no session comes back (see domain.d.ts:
// SignUp.Data is `{ user }`, unlike SignIn.Data which includes the tokens).
// The caller signs in right after with the same credentials to get a session.
export async function signUp(params: { email: string; password: string }): Promise<{ user: AuthUser }> {
  return unwrap(signUpService(params, {}));
}

export async function signIn(params: { email: string; password: string }): Promise<AuthResult> {
  const data = await unwrap(signInService(params, {}));
  return persist(data);
}

// Placeholder: no Google/Apple SDK or client credentials are wired into this
// project yet, so there is no real popup/redirect here, and no domain
// service exists for it either. Once the native SDKs are integrated, this
// exchanges their id token with the backend the same way — the rest of the
// flow (emailVerified branch, session storage) stays unchanged.
export async function signInWithSocial(provider: SocialProvider): Promise<AuthResult> {
  await new Promise(resolve => setTimeout(resolve, 900));

  return persist({
    accessToken: `simulated-${provider}-access-token`,
    refreshToken: `simulated-${provider}-refresh-token`,
    expiresIn: 3600,
    emailVerified: false,
    user: {
      uid: `simulated-${provider}-user`,
      email: '',
    } as unknown as AuthUser,
  });
}

// --- Email verification (shared by sign-in and sign-up) ---------------
// sendEmailOtp hands back a `token` that must be carried into
// verifyEmailOtp along with the email and the code the user typed.

export function sendEmailOtp(params: { email: string }): Promise<{ token: string }> {
  return unwrap(sendEmailOtpService(params, {}));
}

export async function verifyEmailOtp(params: { email: string; token: string; otp: string }): Promise<{ succeed: boolean }> {
  const data = await unwrap(verifyEmailOtpService(params, {}));
  const user = getStoredUser();
  if (data.succeed && user) setStoredUser({ ...user, emailVerified: true });
  return data;
}

// --- Token refresh --------------------------------------------------------
// Normally invoked automatically by httpFetch (see rest/http.ts) on a 401 or
// as the access token nears its expiry; exposed here too for manual use.
export async function refreshAccessToken(params: { refreshToken: string }): Promise<{ accessToken: string; expiresIn: number }> {
  const data = await unwrap(refreshAccessTokenService(params, {}));
  saveAccessToken(data);
  return data;
}

// --- Password reset (signed out) ------------------------------------------

export function sendResetPassword(params: { email: string }): Promise<{ succeed: boolean }> {
  return unwrap(sendResetPasswordService(params, {}));
}

export function resetPassword(params: { token: string; newPassword: string }): Promise<{ succeed: boolean }> {
  return unwrap(resetPasswordService(params, {}));
}

// --- Profile (signed in) ----------------------------------------------------

export function changeMyPassword(params: { oldPassword: string; newPassword: string }): Promise<{ succeed: boolean }> {
  return unwrap(changePasswordService(params, {}));
}

// Concurrent callers (e.g. updateMyInfo's refetch + a page's mount fetch)
// share one request.
let currentUserPromise: Promise<AuthUser> | null = null;

export function getCurrentUser(): Promise<AuthUser> {
  if (!currentUserPromise) {
    currentUserPromise = unwrap(getCurrentUserService({}, {}))
      .then(data => {
        const user: AuthUser = { ...data.user, emailVerified: data.emailVerified };
        setStoredUser(user);
        return user;
      })
      .finally(() => {
        currentUserPromise = null;
      });
  }
  return currentUserPromise;
}

export async function updateMyInfo(params: {
  name?: string;
  gender?: Gender;
  birthdate?: string;
  preferedLang?: 'ar' | 'en';
}): Promise<{ success: boolean }> {
  const data = await unwrap(updateMyInfoService(params, {}));
  // Data only reports { success } — refetch so the cached profile actually
  // matches what the server saved.
  await getCurrentUser().catch(() => {});
  return data;
}

export function signOut(): void {
  clearSession();
  // The next user (or session) starts their own conversation.
  resetConversation();
}
