import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Field, inputClass } from '../components/ui/field';
import { AuthShell } from '../components/AuthShell';
import { cn } from '../lib/utils';
import { sendResetPassword, resetPassword } from '../api/auth';
import { errorMessage } from '../api/rest/apiError';
import { textDirection } from '../lib/textDirection';
import { getAppLang, setAppLang, type AppLang } from '../lib/appLanguage';

type Phase = 'request' | 'sent' | 'confirm' | 'done';

const COPY = {
  ar: {
    brand: 'المعلّم الذكي',
    requestTitle: 'إعادة تعيين كلمة المرور',
    requestSubtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين',
    email: 'البريد الإلكتروني',
    sendLink: 'إرسال الرابط',
    sentTitle: 'تحقق من بريدك',
    sentSubtitle: (email: string) => `أرسلنا رابط إعادة التعيين إلى ${email}`,
    backToSignIn: 'العودة إلى تسجيل الدخول',
    confirmTitle: 'تعيين كلمة مرور جديدة',
    confirmSubtitle: 'اختر كلمة مرور جديدة لحسابك',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordMismatch: 'كلمتا المرور غير متطابقتين',
    resetButton: 'إعادة التعيين',
    doneTitle: 'تم تحديث كلمة المرور',
    doneSubtitle: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة',
    signInButton: 'تسجيل الدخول',
  },
  en: {
    brand: 'AI Tutor',
    requestTitle: 'Reset your password',
    requestSubtitle: "Enter your email and we'll send you a reset link",
    email: 'Email',
    sendLink: 'Send reset link',
    sentTitle: 'Check your email',
    sentSubtitle: (email: string) => `We sent a reset link to ${email}`,
    backToSignIn: 'Back to sign in',
    confirmTitle: 'Set a new password',
    confirmSubtitle: 'Choose a new password for your account',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    passwordMismatch: 'Passwords do not match',
    resetButton: 'Reset password',
    doneTitle: 'Password updated',
    doneSubtitle: 'You can now sign in with your new password',
    signInButton: 'Sign in',
  },
} as const;

export default function ResetPasswordView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // The session language: saved, so it carries across pages and reloads.
  const [lang, setLang] = useState<AppLang>(getAppLang);
  const t = COPY[lang];

  useEffect(() => {
    setAppLang(lang);
  }, [lang]);

  const [phase, setPhase] = useState<Phase>(token ? 'confirm' : 'request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    setError(undefined);
    setLoading(true);
    try {
      await sendResetPassword({ email });
      setPhase('sent');
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !passwordValid) return;
    setError(undefined);
    setLoading(true);
    try {
      await resetPassword({ token, newPassword });
      setPhase('done');
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell lang={lang} onLangChange={setLang} brand={t.brand}>
      {phase === 'request' && (
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <div className="mb-1 text-center">
            <p className="text-[16px] font-semibold text-text">{t.requestTitle}</p>
            <p className="mt-1 text-[13.5px] text-text-muted">{t.requestSubtitle}</p>
          </div>

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

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <Button type="submit" disabled={loading || !emailValid} className="mt-1 w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.sendLink}
          </Button>

          <Link to="/auth" className="text-center text-[13px] font-medium text-accent-600 hover:text-accent-700">
            {t.backToSignIn}
          </Link>
        </form>
      )}

      {phase === 'sent' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-text">{t.sentTitle}</p>
            <p className="mt-1.5 text-[13.5px] text-text-muted">{t.sentSubtitle(email)}</p>
          </div>
          <Link to="/auth" className="text-[13px] font-medium text-accent-600 hover:text-accent-700">
            {t.backToSignIn}
          </Link>
        </div>
      )}

      {phase === 'confirm' && (
        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <div className="mb-1 text-center">
            <p className="text-[16px] font-semibold text-text">{t.confirmTitle}</p>
            <p className="mt-1 text-[13.5px] text-text-muted">{t.confirmSubtitle}</p>
          </div>

          <Field label={t.newPassword}>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
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
          </Field>

          <Field label={t.confirmPassword}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              required
            />
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <p className="text-xs text-danger">{t.passwordMismatch}</p>
            )}
          </Field>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <Button type="submit" disabled={loading || !passwordValid} className="mt-1 w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.resetButton}
          </Button>
        </form>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-text">{t.doneTitle}</p>
            <p className="mt-1.5 text-[13.5px] text-text-muted">{t.doneSubtitle}</p>
          </div>
          <Button onClick={() => navigate('/auth')} className="w-full">
            {t.signInButton}
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
