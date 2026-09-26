import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Field, inputClass } from '../components/ui/field';
import { cn } from '../lib/utils';
import { changeMyPassword } from '../api/auth';
import { errorMessage } from '../api/rest/apiError';

const COPY = {
  ar: {
    title: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور الجديدة',
    passwordMismatch: 'كلمتا المرور غير متطابقتين',
    save: 'حفظ التغييرات',
    doneTitle: 'تم تغيير كلمة المرور',
    doneSubtitle: 'يمكنك الآن استخدام كلمة المرور الجديدة عند تسجيل الدخول',
    backToProfile: 'العودة إلى الملف الشخصي',
  },
  en: {
    title: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordMismatch: 'Passwords do not match',
    save: 'Save changes',
    doneTitle: 'Password changed',
    doneSubtitle: 'You can now use your new password to sign in',
    backToProfile: 'Back to profile',
  },
} as const;

export default function ChangePasswordView() {
  const navigate = useNavigate();
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
  const t = COPY[lang];

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(undefined);
    setLoading(true);
    try {
      await changeMyPassword({ oldPassword: currentPassword, newPassword });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <PageHeader title={t.title} onBack={() => navigate('/profile')} />

      <main className="mx-auto w-full max-w-[440px] flex-1 px-6 py-10">
        {done ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-7 text-center shadow-e1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-text">{t.doneTitle}</p>
              <p className="mt-1.5 text-[13.5px] text-text-muted">{t.doneSubtitle}</p>
            </div>
            <Button onClick={() => navigate('/profile')} className="w-full">
              {t.backToProfile}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-7 shadow-e1"
          >
            <Field label={t.currentPassword}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
              />
            </Field>

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

            <Button type="submit" disabled={loading || !canSubmit} className="mt-1 w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.save}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
