// Central catalog for every error code a ServiceResult can carry — the
// generic ones (UnknownError/ParamMissingError/InvalidParamError/ServerError/
// Locked) plus each service's own ErrorCodes (NotFound, NOT_FOUND,
// INCORRECT_CREDENTIAL, NoChanges, ...). Add a service-specific code here as
// soon as it shows up in domain.d.ts so it gets a real message instead of
// falling back to whatever the backend put in `description`.
const MESSAGES: Partial<Record<string, { ar: string; en: string }>> = {
  UnknownError: { ar: 'حدث خطأ غير متوقع', en: 'Something went wrong' },
  ParamMissingError: { ar: 'توجد بيانات ناقصة في الطلب', en: 'Missing required information' },
  InvalidParamError: { ar: 'بيانات غير صالحة', en: 'Invalid information provided' },
  ServerError: { ar: 'خطأ في الخادم، حاول مرة أخرى لاحقاً', en: 'Server error — please try again' },
  Locked: { ar: 'الحساب مقفل مؤقتاً', en: 'This account is temporarily locked' },
  MISSING_TOKEN: { ar: 'وصول غير مصرح به، الرجاء تسجيل الدخول مرة أخرى', en: 'Unauthorized access — please sign in again' },
  NotFound: { ar: 'العنصر المطلوب غير موجود', en: 'Not found' },
  NOT_FOUND: { ar: 'لا يوجد حساب بهذا البريد الإلكتروني', en: 'No account found with that email' },
  INCORRECT_CREDENTIAL: { ar: 'كلمة المرور غير صحيحة', en: 'Incorrect password' },
  ALREADY_REGISTERED: { ar: 'يوجد حساب مسجّل بهذا البريد الإلكتروني بالفعل', en: 'An account with this email already exists' },
  UNAUTHORIZED: { ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء', en: 'You are not allowed to do this' },
  NoChanges: { ar: 'لا توجد تغييرات لحفظها', en: 'Nothing changed' },
  NetworkError: { ar: 'تعذّر الاتصال بالخادم', en: 'Could not reach the server' },
  HTTPError: { ar: 'حدث خطأ أثناء الاتصال بالخادم', en: 'A server communication error occurred' },
};

export function messageForCode(code: string, lang: 'ar' | 'en', fallback?: string): string {
  return MESSAGES[code]?.[lang] ?? fallback ?? code;
}

// Every non-2xx response from this backend is a ServiceResult:
// { app, service, data, warnings, error: { code, description }, instanceId }.
// ApiError carries that `code` through (rather than collapsing it to a
// generic "request failed") so callers can branch on it or just show the
// localized message.
export class ApiError extends Error {
  code: string;
  httpStatus?: number;
  missingParams?: string[];

  constructor(code: string, description?: string, httpStatus?: number, missingParams?: string[]) {
    super(description || code);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.missingParams = missingParams;
  }

  messageFor(lang: 'ar' | 'en'): string {
    return messageForCode(this.code, lang, this.message);
  }
}

export function errorMessage(err: unknown, lang: 'ar' | 'en'): string {
  if (err instanceof ApiError) return err.messageFor(lang);
  if (err instanceof Error) return err.message;
  return String(err);
}
