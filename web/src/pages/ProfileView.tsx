import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, KeyRound, LogOut, Pencil, UserCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { signOut } from '../api/auth';

const COPY = {
  ar: {
    title: 'الملف الشخصي',
    verified: 'موثّق',
    unverified: 'غير موثّق',
    email: 'البريد الإلكتروني',
    birthdate: 'تاريخ الميلاد',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    notSet: 'غير محدد',
    editProfile: 'تعديل الملف الشخصي',
    changePassword: 'تغيير كلمة المرور',
    signOut: 'تسجيل الخروج',
    guestTitle: 'لم يتم تسجيل الدخول',
    guestSubtitle: 'سجّل الدخول لعرض ملفك الشخصي',
    signIn: 'تسجيل الدخول',
  },
  en: {
    title: 'Profile',
    verified: 'Verified',
    unverified: 'Unverified',
    email: 'Email',
    birthdate: 'Date of birth',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    notSet: 'Not set',
    editProfile: 'Edit profile',
    changePassword: 'Change password',
    signOut: 'Sign out',
    guestTitle: 'Not signed in',
    guestSubtitle: 'Sign in to view your profile',
    signIn: 'Sign in',
  },
} as const;

export default function ProfileView() {
  const navigate = useNavigate();
  const t = COPY[document.documentElement.lang === 'en' ? 'en' : 'ar'];
  const { user } = useCurrentUser();

  const handleSignOut = () => {
    signOut();
    navigate('/auth');
  };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <PageHeader title={t.title} onBack={() => navigate('/')} />
        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <UserCircle2 className="h-12 w-12 text-text-faint" strokeWidth={1.5} />
          <div>
            <p className="text-[16px] font-semibold text-text">{t.guestTitle}</p>
            <p className="mt-1.5 text-[13.5px] text-text-muted">{t.guestSubtitle}</p>
          </div>
          <Button onClick={() => navigate('/auth')}>{t.signIn}</Button>
        </main>
      </div>
    );
  }

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <PageHeader title={t.title} onBack={() => navigate('/')} />

      <main className="mx-auto w-full max-w-[440px] flex-1 px-6 py-10">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-7 text-center shadow-e1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-[22px] font-semibold text-accent-700">
            {initial}
          </div>
          <div>
            <p className="text-[16px] font-semibold text-text">{user.name || user.email}</p>
            <Badge variant={user.emailVerified ? 'success' : 'neutral'} className="mt-1.5">
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
              {user.emailVerified ? t.verified : t.unverified}
            </Badge>
          </div>
        </div>

        <div className="mt-5 divide-y divide-border rounded-xl border border-border bg-surface shadow-e1">
          <InfoRow label={t.email} value={user.email ?? t.notSet} />
          <InfoRow label={t.birthdate} value={user.birthdate || t.notSet} />
          <InfoRow
            label={t.gender}
            value={user.gender === 'm' ? t.male : user.gender === 'f' ? t.female : t.notSet}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button asChild variant="secondary" className="w-full">
            <Link to="/profile/edit">
              <Pencil className="h-4 w-4" strokeWidth={2} />
              {t.editProfile}
            </Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/profile/change-password">
              <KeyRound className="h-4 w-4" strokeWidth={2} />
              {t.changePassword}
            </Link>
          </Button>
          <Button variant="ghost" onClick={handleSignOut} className="w-full text-danger hover:bg-danger-bg">
            <LogOut className="h-4 w-4" strokeWidth={2} />
            {t.signOut}
          </Button>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="text-[13.5px] font-medium text-text">{value}</span>
    </div>
  );
}
