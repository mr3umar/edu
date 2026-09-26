import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Field, inputClass } from '../components/ui/field';
import { cn } from '../lib/utils';
import { updateMyInfo } from '../api/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ApiError, errorMessage } from '../api/rest/apiError';
import type { AuthUser, Gender } from '../types/auth';
import { textDirection } from '../lib/textDirection';

const COPY = {
  ar: {
    title: 'تعديل الملف الشخصي',
    email: 'البريد الإلكتروني',
    name: 'الاسم الكامل',
    namePlaceholder: 'اسمك الكامل',
    birthdate: 'تاريخ الميلاد',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    save: 'حفظ التغييرات',
  },
  en: {
    title: 'Edit profile',
    email: 'Email',
    name: 'Full name',
    namePlaceholder: 'Your full name',
    birthdate: 'Date of birth',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    save: 'Save changes',
  },
} as const;

export default function ProfileEditView() {
  const navigate = useNavigate();
  const t = COPY[document.documentElement.lang === 'en' ? 'en' : 'ar'];
  const { user, refreshing } = useCurrentUser();

  // The form seeds its fields from the user once, so wait for the fresh copy.
  if (refreshing) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <PageHeader title={t.title} onBack={() => navigate('/profile')} />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-text-faint" />
        </main>
      </div>
    );
  }

  return <ProfileEditForm user={user} />;
}

function ProfileEditForm({ user }: { user: AuthUser | undefined }) {
  const navigate = useNavigate();
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
  const t = COPY[lang];

  const [name, setName] = useState(user?.name ?? '');
  const [birthdate, setBirthdate] = useState(user?.birthdate ?? '');
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Every field is optional — only send what was filled in.
    const params: Parameters<typeof updateMyInfo>[0] = {};
    if (name.trim()) params.name = name.trim();
    if (birthdate) params.birthdate = birthdate;
    if (gender) params.gender = gender;
    if (Object.keys(params).length === 0) {
      navigate('/profile');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await updateMyInfo(params);
      navigate('/profile');
    } catch (err) {
      // Not really a failure — nothing to persist — so don't block navigation.
      if (err instanceof ApiError && err.code === 'NoChanges') {
        navigate('/profile');
        return;
      }
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <PageHeader title={t.title} onBack={() => navigate('/profile')} />

      <main className="mx-auto w-full max-w-[440px] flex-1 px-6 py-10">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-7 shadow-e1"
        >
          <Field label={t.email}>
            <input value={user?.email ?? ''} dir={textDirection(user?.email ?? '')} disabled className={inputClass} />
          </Field>

          <Field label={t.name}>
            <input
              dir={textDirection(name)}
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className={inputClass}
            />
          </Field>

          <Field label={t.birthdate}>
            <input
              type="date"
              value={birthdate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBirthdate(e.target.value)}
              className={inputClass}
              max={new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <Field label={t.gender}>
            <div className="grid grid-cols-2 gap-2.5">
              {(['m', 'f'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(gender === g ? null : g)}
                  className={cn(
                    'rounded-lg border px-4 py-2.5 text-[13.5px] font-medium transition-colors',
                    gender === g
                      ? 'border-accent-600 bg-accent-50 text-accent-700'
                      : 'border-border text-text-muted hover:bg-surface-2'
                  )}
                >
                  {g === 'm' ? t.male : t.female}
                </button>
              ))}
            </div>
          </Field>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.save}
          </Button>
        </form>
      </main>
    </div>
  );
}
