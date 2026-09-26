import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Field, inputClass } from '../components/ui/field';
import { AuthShell } from '../components/AuthShell';
import { cn } from '../lib/utils';
import { signIn, signUp, sendEmailOtp, verifyEmailOtp, getCurrentUser, signInWithSocial } from '../api/auth';
import { ApiError, errorMessage } from '../api/rest/apiError';
import { textDirection } from '../lib/textDirection';
import type { AuthResult, SocialProvider } from '../types/auth';
import { getAppLang, setAppLang, type AppLang } from '../lib/appLanguage';

type Mode = 'signin' | 'signup';
type Step = 'form' | 'otp';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const COPY = {
  ar: {
    brand: 'المعلّم الذكي',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    continueWithGoogle: 'المتابعة عبر جوجل',
    continueWithApple: 'المتابعة عبر آبل',
    or: 'أو',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordMismatch: 'كلمتا المرور غير متطابقتين',
    forgotPassword: 'نسيت كلمة المرور؟',
    createAccount: 'إنشاء الحساب',
    otpTitle: 'تحقق من بريدك الإلكتروني',
    otpSubtitle: 'أرسلنا رمزاً مكوناً من 6 أرقام إلى بريدك الإلكتروني',
    verify: 'تأكيد',
    resend: 'إعادة إرسال الرمز',
    resendIn: (s: number) => `إعادة الإرسال خلال ${s} ثانية`,
    changeEmail: 'الرجوع',
  },
  en: {
    brand: 'AI Tutor',
    signIn: 'Sign in',
    signUp: 'Sign up',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    or: 'or',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    passwordMismatch: 'Passwords do not match',
    forgotPassword: 'Forgot password?',
    createAccount: 'Create account',
    otpTitle: 'Check your email',
    otpSubtitle: 'We sent a 6-digit code to your email',
    verify: 'Verify',
    resend: 'Resend code',
    resendIn: (s: number) => `Resend in ${s}s`,
    changeEmail: 'Back',
  },
} as const;

export default function AuthView() {
  const navigate = useNavigate();
  // The session language: saved, so it carries across pages and reloads.
  const [lang, setLang] = useState<AppLang>(getAppLang);
  const t = COPY[lang];

  useEffect(() => {
    setAppLang(lang);
  }, [lang]);

  const [mode, setMode] = useState<Mode>('signin');
  const [step, setStep] = useState<Step>('form');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpToken, setOtpToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const finishAuth = () => navigate('/');

  // Email sign-in and sign-up only: send the OTP and route to verification
  // when the signIn response reports data.emailVerified === false.
  const afterAuthResult = async (result: AuthResult) => {
    if (result.emailVerified !== false) {
      finishAuth();
      return;
    }
    const { token } = await sendEmailOtp({ email: result.user.email ?? email });
    setOtpToken(token);
    setResendCooldown(RESEND_SECONDS);
    setStep('otp');
  };

  const handleSocial = async (provider: SocialProvider) => {
    setError(undefined);
    setSocialLoading(provider);
    try {
      await signInWithSocial(provider);
      finishAuth();
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setSocialLoading(null);
    }
  };

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = password.length >= 8;
  const canSubmitSignIn = emailValid && password.length > 0;
  const canSubmitSignUp = emailValid && passwordValid && password === confirmPassword;

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (mode === 'signin') {
      if (!canSubmitSignIn) return;
      setLoading(true);
      try {
        await afterAuthResult(await signIn({ email, password }));
      } catch (err) {
        setError(errorMessage(err, lang));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!canSubmitSignUp) return;
    setLoading(true);
    try {
      // signUp only creates the account (no session in its response) — sign
      // in right after with the same credentials to get one.
      await signUp({ email, password });
      await afterAuthResult(await signIn({ email, password }));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALREADY_REGISTERED') {
        // They already have an account — send them to sign in instead of
        // just showing an error on a form they can't successfully submit.
        setMode('signin');
        setConfirmPassword('');
      }
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const otpValue = otp.join('');
  const otpComplete = otpValue.length === OTP_LENGTH;

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setOtp(prev => {
      const next = [...prev];
      pasted.split('').forEach((d, i) => {
        next[i] = d;
      });
      return next;
    });
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (!otpComplete) return;
    setError(undefined);
    setLoading(true);
    try {
      await verifyEmailOtp({ email, token: otpToken, otp: otpValue });
      // verifyEmailOtp only returns { succeed } — refetch so the cached
      // user actually reflects emailVerified: true.
      await getCurrentUser().catch(() => {});
      // Freshly verified — send them to fill in their info next.
      navigate('/profile/edit');
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(undefined);
    try {
      const { token } = await sendEmailOtp({ email });
      setOtpToken(token);
      setResendCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err, lang));
    }
  };

  return (
    <AuthShell lang={lang} onLangChange={setLang} brand={t.brand}>
      {step === 'form' && (
        <>
          <div className="mb-6 flex items-center rounded-full border border-border bg-surface-2 p-0.5">
            <button
              onClick={() => {
                setMode('signin');
                setError(undefined);
              }}
              className={cn(
                'flex-1 rounded-full px-3 py-2 text-[13.5px] font-semibold transition-colors',
                mode === 'signin' ? 'bg-accent-600 text-accent-foreground' : 'text-text-muted hover:text-text'
              )}
            >
              {t.signIn}
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(undefined);
              }}
              className={cn(
                'flex-1 rounded-full px-3 py-2 text-[13.5px] font-semibold transition-colors',
                mode === 'signup' ? 'bg-accent-600 text-accent-foreground' : 'text-text-muted hover:text-text'
              )}
            >
              {t.signUp}
            </button>
          </div>

          <div className="mb-5 flex flex-col gap-2.5">
            <SocialButton
              provider="google"
              label={t.continueWithGoogle}
              loading={socialLoading === 'google'}
              onClick={() => handleSocial('google')}
            />
            <SocialButton
              provider="apple"
              label={t.continueWithApple}
              loading={socialLoading === 'apple'}
              onClick={() => handleSocial('apple')}
            />
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-faint">{t.or}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            <Field label={t.email}>
              <input
                type="email"
                dir={textDirection(email)}
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                required
              />
            </Field>

            <Field label={t.password}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(inputClass, 'pe-10')}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-text-faint hover:text-text"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === 'signin' && (
                <Link to="/reset-password" className="self-end text-xs font-medium text-accent-600 hover:text-accent-700">
                  {t.forgotPassword}
                </Link>
              )}
            </Field>

            {mode === 'signup' && (
              <Field label={t.confirmPassword}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  required
                />
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-xs text-danger">{t.passwordMismatch}</p>
                )}
              </Field>
            )}

            {error && <p className="text-[13px] text-danger">{error}</p>}

            <Button
              type="submit"
              disabled={loading || (mode === 'signin' ? !canSubmitSignIn : !canSubmitSignUp)}
              className="mt-1 w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? t.signIn : t.createAccount}
            </Button>
          </form>
        </>
      )}

      {step === 'otp' && (
        <div className="flex flex-col items-center gap-5 text-center">
          <div>
            <p className="text-[16px] font-semibold text-text">{t.otpTitle}</p>
            <p className="mt-1.5 text-[13.5px] text-text-muted">{t.otpSubtitle}</p>
          </div>

          <div className="flex gap-2" dir="ltr">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => {
                  otpRefs.current[i] = el;
                }}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                onPaste={handleOtpPaste}
                inputMode="numeric"
                maxLength={1}
                className="h-12 w-11 rounded-lg border border-border-strong bg-surface-2 text-center text-lg font-semibold text-text outline-none focus:border-accent-600"
              />
            ))}
          </div>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <Button onClick={handleVerifyOtp} disabled={loading || !otpComplete} className="w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.verify}
          </Button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-[13px] font-medium text-accent-600 disabled:text-text-faint"
            >
              {resendCooldown > 0 ? t.resendIn(resendCooldown) : t.resend}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setOtp(Array(OTP_LENGTH).fill(''));
              }}
              className="text-[13px] text-text-faint hover:text-text-muted"
            >
              {t.changeEmail}
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

function SocialButton({
  provider,
  label,
  loading,
  onClick,
}: {
  provider: SocialProvider;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface text-[13.5px] font-semibold text-text transition-colors hover:bg-surface-2 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
      ) : provider === 'google' ? (
        <GoogleIcon className="h-4 w-4" />
      ) : (
        <AppleIcon className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.23-1.21 3.04-.83.9-2.18 1.6-3.29 1.51-.14-1.1.42-2.26 1.19-3.05.85-.9 2.29-1.58 3.31-1.5zM20.5 17.34c-.48 1.11-.71 1.6-1.33 2.58-.87 1.36-2.09 3.06-3.61 3.07-1.35.02-1.7-.88-3.53-.87-1.83.01-2.21.89-3.56.87-1.52-.02-2.68-1.55-3.55-2.9C2.4 16.86 2.09 12.4 3.58 10c.99-1.6 2.58-2.55 4.06-2.55 1.5 0 2.44.9 3.67.9 1.19 0 1.93-.9 3.67-.9 1.28 0 2.64.7 3.6 1.9-3.17 1.74-2.65 6.26.92 7.99z" />
    </svg>
  );
}
