import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, Sparkles, Plus, Upload, Camera, CheckCircle2, AlertCircle, MoreVertical, Trash2, Loader2 } from 'lucide-react';
import { deleteMyBook, listMyBooks } from '../api/rest/services/books';
import type { ListMyBooks } from '../domain';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { uploadPdf } from '../api/uploadPdf';
import { messageForCode, errorMessage } from '../api/rest/apiError';
import { BOOK_PROCESSING_POLL_MS, BOOK_STATUS_LABELS, bookProcessingInfo } from '../lib/bookStatus';
import { getAppLang, setAppLang, type AppLang } from '../lib/appLanguage';


type BookItem = ListMyBooks['Data']['items'][number];
type UploadState = 'idle' | 'uploading' | 'done' | 'error';


const COPY = {
  ar: {
    brand: 'المعلّم الذكي',
    welcome: 'مرحباً بعودتك',
    guest: 'زائر',
    library: 'مكتبتي',
    subtitleProfile: 'تابع رحلتك التعليمية مع معلمك الذكي',
    booksCount: (n: number) => `${n} كتاب متاح`,
    loadError: 'تعذّر تحميل الكتب',
    empty: 'لا توجد كتب بعد',
    pages: 'صفحة',
    footerTagline: 'منصّة تعليمية مدعومة بالذكاء الاصطناعي',
    footerRights: `© ${new Date().getFullYear()} جميع الحقوق محفوظة`,
    addBook: 'إضافة كتاب',
    uploadFromDevice: 'رفع من الجهاز',
    uploadFromCamera: 'استخدام الكاميرا',
    uploading: 'جارٍ الرفع…',
    uploadDone: 'تم الرفع بنجاح',
    uploadError: 'تعذّر رفع الملف',
    bookOptions: 'خيارات الكتاب',
    removeBook: 'حذف الكتاب',
    removeTitle: 'حذف هذا الكتاب؟',
    removeDescription: (title: string) => `سيتم حذف «${title}» من مكتبتك نهائياً.`,
    removeConfirm: 'حذف',
    removing: 'جارٍ الحذف…',
    cancel: 'إلغاء',
    removeError: 'تعذّر حذف الكتاب',
    status: BOOK_STATUS_LABELS.ar,
  },
  en: {
    brand: 'AI Tutor',
    welcome: 'Welcome back',
    guest: 'Guest',
    library: 'My Library',
    subtitleProfile: 'Continue your learning journey with your AI tutor',
    booksCount: (n: number) => `${n} books available`,
    loadError: 'Could not load books',
    empty: 'No books yet',
    pages: 'pages',
    footerTagline: 'An AI-powered learning platform',
    footerRights: `© ${new Date().getFullYear()} All rights reserved`,
    addBook: 'Add book',
    uploadFromDevice: 'Upload from device',
    uploadFromCamera: 'Use camera',
    uploading: 'Uploading…',
    uploadDone: 'Uploaded successfully',
    uploadError: 'Could not upload the file',
    bookOptions: 'Book options',
    removeBook: 'Remove book',
    removeTitle: 'Remove this book?',
    removeDescription: (title: string) => `"${title}" will be permanently removed from your library.`,
    removeConfirm: 'Remove',
    removing: 'Removing…',
    cancel: 'Cancel',
    removeError: 'Could not remove the book',
    status: BOOK_STATUS_LABELS.en,
  },
} as const;

export default function HomeView() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  // The session language: saved, so it carries across pages and reloads.
  const [lang, setLang] = useState<AppLang>(getAppLang);

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string>();

  const [bookToRemove, setBookToRemove] = useState<BookItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeErrorMessage, setRemoveErrorMessage] = useState<string>();

  const deviceInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const t = COPY[lang];

  useEffect(() => {
    setAppLang(lang);
  }, [lang]);

  const loadBooks = useCallback(() => {
    setLoading(true);
    setError(undefined);

    return listMyBooks({}, {})
      .then(result => {
        if (result.error) {
          setError(messageForCode(result.error.code, lang, result.error.description));
        } else {
          setBooks(result.data.items);
        }
      })
      .catch(err => setError(errorMessage(err, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // While any book is still being processed, quietly refresh the list so its
  // status/statusProgress stay current without flashing the loading skeleton.
  const hasProcessingBooks = books.some(b => bookProcessingInfo(b).processing);

  useEffect(() => {
    if (!hasProcessingBooks) return;

    const interval = setInterval(() => {
      listMyBooks({}, {})
        .then(result => {
          if (!result.error) setBooks(result.data.items);
        })
        .catch(() => {});
    }, BOOK_PROCESSING_POLL_MS);
    return () => clearInterval(interval);
  }, [hasProcessingBooks]);

  useEffect(() => {
    if (uploadState === 'done') {
      const timeout = setTimeout(() => {
        setUploadState('idle');
        setSelectedFile(null);
        loadBooks();
      }, 900);
      return () => clearTimeout(timeout);
    }

    if (uploadState === 'error') {
      const timeout = setTimeout(() => {
        setUploadState('idle');
        setSelectedFile(null);
      }, 1800);
      return () => clearTimeout(timeout);
    }
  }, [uploadState, loadBooks]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSelectedFile(file);
    setUploadState('uploading');
    setProgress(0);
    setUploadErrorMessage(undefined);

    uploadPdf({
      file,
      onProgress: fraction => setProgress(fraction * 100),
    })
      .then(() => setUploadState('done'))
      .catch(err => {
        setUploadErrorMessage(errorMessage(err, lang));
        setUploadState('error');
      });
  };

  const closeRemoveDialog = () => {
    if (removing) return;
    setBookToRemove(null);
    setRemoveErrorMessage(undefined);
  };

  const handleRemoveBook = () => {
    if (!bookToRemove) return;
    const uid = bookToRemove.uid;

    setRemoving(true);
    setRemoveErrorMessage(undefined);

    deleteMyBook({ uid }, {})
      .then(result => {
        if (result.error) {
          setRemoveErrorMessage(messageForCode(result.error.code, lang, result.error.description));
          return;
        }
        setBooks(prev => prev.filter(b => b.uid !== uid));
        setBookToRemove(null);
      })
      .catch(err => setRemoveErrorMessage(errorMessage(err, lang)))
      .finally(() => setRemoving(false));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-600 text-accent-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <span className="text-[15px] font-semibold text-text">{t.brand}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-border bg-surface-2 p-0.5">
            <button
              onClick={() => setLang('ar')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                lang === 'ar' ? 'bg-accent-600 text-accent-foreground' : 'text-text-muted hover:text-text'
              )}
            >
              AR
            </button>
            <button
              onClick={() => setLang('en')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                lang === 'en' ? 'bg-accent-600 text-accent-foreground' : 'text-text-muted hover:text-text'
              )}
            >
              EN
            </button>
          </div>

          <Link
            to="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700 transition-opacity hover:opacity-80"
          >
            {t.guest.charAt(0)}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
        <Link to="/profile" className="mb-9 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-[15px] font-semibold text-accent-700">
            {t.guest.charAt(0)}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-text">
              {t.welcome}، {t.guest}
            </p>
            <p className="text-xs text-text-muted">{t.subtitleProfile}</p>
          </div>
        </Link>

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-text">{t.library}</h1>
            {!loading && !error && (
              <p className="mt-1 text-[13px] text-text-muted">{t.booksCount(books.length)}</p>
            )}
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" strokeWidth={2.25} />
                {t.addBook}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 w-56 rounded-lg border border-border bg-surface p-1 shadow-e2"
              >
                <DropdownMenu.Item
                  onSelect={() => deviceInputRef.current?.click()}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] text-text outline-none transition-colors data-[highlighted]:bg-surface-2"
                >
                  <Upload className="h-4 w-4 text-text-muted" strokeWidth={1.9} />
                  {t.uploadFromDevice}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => cameraInputRef.current?.click()}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] text-text outline-none transition-colors data-[highlighted]:bg-surface-2"
                >
                  <Camera className="h-4 w-4 text-text-muted" strokeWidth={1.9} />
                  {t.uploadFromCamera}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <input
            ref={deviceInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileSelected}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex animate-pulse flex-col overflow-hidden rounded-lg bg-surface-2">
                <div className="aspect-[10/9]" />
                <div className="h-[92px] border-t border-surface" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-border bg-surface px-5 py-4 text-[14.5px] text-text-muted">
            {t.loadError}: {error}
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center text-[15px] text-text-muted">
            {t.empty}
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {books.map(book => {
              const { status, processing, percent } = bookProcessingInfo(book);

              return (
                <div key={book.uid} className="group relative">
                  <Link
                    to={`/book/${book.uid}`}
                    className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-e1 transition-shadow hover:shadow-e2"
                  >
                    <BookCover url={book.thumbnailUrl} />
                    <div className="flex flex-1 flex-col gap-2.5 p-4">
                      <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-text">
                        {book.title}
                      </p>

                      <div className="mt-auto flex h-6 items-center justify-between gap-3 text-xs">
                        {processing ? (
                          <>
                            <span className="flex min-w-0 items-center gap-1.5 text-text-muted">
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-600" strokeWidth={2.25} />
                              <span className="truncate">{t.status[status!]}</span>
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <div
                                role="progressbar"
                                aria-label={t.status[status!]}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={percent}
                                className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-2"
                              >
                                <div
                                  className="h-full rounded-full bg-accent-600 transition-[width] duration-500 ease-out"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="tabular-nums text-text-faint">{percent}%</span>
                            </div>
                          </>
                        ) : (
                          book.pages && (
                            <span className="text-text-faint">
                              {book.pages.length} {t.pages}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </Link>

                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        aria-label={t.bookOptions}
                        className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-text-muted shadow-e1 transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 data-[state=open]:bg-surface data-[state=open]:text-text"
                      >
                        <MoreVertical className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={6}
                        className="z-50 w-48 rounded-lg border border-border bg-surface p-1 shadow-e2"
                      >
                        <DropdownMenu.Item
                          onSelect={() => {
                            setRemoveErrorMessage(undefined);
                            setBookToRemove(book);
                          }}
                          className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] text-danger outline-none transition-colors data-[highlighted]:bg-danger-bg"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                          {t.removeBook}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-border px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-start">
          <p className="text-xs font-medium text-text-muted">{t.brand} · {t.footerTagline}</p>
          <p className="text-xs text-text-faint">{t.footerRights}</p>
        </div>
      </footer>

      <Dialog.Root open={bookToRemove !== null} onOpenChange={open => !open && closeRemoveDialog()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content
            onEscapeKeyDown={e => {
              if (removing) e.preventDefault();
            }}
            onPointerDownOutside={e => {
              if (removing) e.preventDefault();
            }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-e3 focus:outline-none"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
                <Trash2 className="h-6 w-6" strokeWidth={2} />
              </div>

              <div className="min-w-0">
                <Dialog.Title className="text-[15px] font-semibold text-text">{t.removeTitle}</Dialog.Title>
                <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-text-muted">
                  {bookToRemove && t.removeDescription(bookToRemove.title)}
                </Dialog.Description>
              </div>

              {removeErrorMessage && (
                <div role="alert" className="flex w-full items-start gap-2 rounded-md bg-danger-bg px-3 py-2.5 text-start text-xs text-danger">
                  <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
                  <span>{t.removeError}: {removeErrorMessage}</span>
                </div>
              )}

              <div className="mt-1 flex w-full gap-2">
                <Button variant="secondary" className="flex-1" onClick={closeRemoveDialog} disabled={removing}>
                  {t.cancel}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-danger text-white hover:bg-danger/90 active:bg-danger/90"
                  onClick={handleRemoveBook}
                  disabled={removing}
                >
                  {removing && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />}
                  {removing ? t.removing : t.removeConfirm}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={uploadState !== 'idle'}
        onOpenChange={open => {
          if (!open && uploadState !== 'uploading') setUploadState('idle');
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content
            onEscapeKeyDown={e => {
              if (uploadState === 'uploading') e.preventDefault();
            }}
            onPointerDownOutside={e => {
              if (uploadState === 'uploading') e.preventDefault();
            }}
            className="fixed left-1/2 top-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-e3 focus:outline-none"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full',
                  uploadState === 'done' && 'bg-success-bg text-success',
                  uploadState === 'error' && 'bg-danger-bg text-danger',
                  uploadState === 'uploading' && 'bg-accent-50 text-accent-600'
                )}
              >
                {uploadState === 'done' && <CheckCircle2 className="h-6 w-6" strokeWidth={2} />}
                {uploadState === 'error' && <AlertCircle className="h-6 w-6" strokeWidth={2} />}
                {uploadState === 'uploading' && <Upload className="h-6 w-6" strokeWidth={2} />}
              </div>

              <div className="min-w-0">
                <Dialog.Title className="text-[15px] font-semibold text-text">
                  {uploadState === 'done' && t.uploadDone}
                  {uploadState === 'error' && t.uploadError}
                  {uploadState === 'uploading' && t.uploading}
                </Dialog.Title>
                <Dialog.Description className="mt-1 max-w-[260px] truncate text-xs text-text-muted">
                  {uploadState === 'error' ? uploadErrorMessage : selectedFile?.name}
                </Dialog.Description>
              </div>

              {uploadState === 'uploading' && (
                <div className="w-full">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent-600 transition-[width] duration-150 ease-out"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs tabular-nums text-text-faint">
                    {Math.round(Math.min(progress, 100))}%
                  </p>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// Book thumbnail (top of the page, cropped to a near-square), falling back to the book icon when there's no thumbnail yet
// (e.g. while the book is still processing) or the image fails to load.
function BookCover({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  return (
    <div className="relative flex aspect-[10/9] items-center justify-center overflow-hidden border-b border-border bg-accent-50">
      {url && !failed ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <BookOpen
          className="h-8 w-8 text-accent-500 transition-transform group-hover:scale-105"
          strokeWidth={1.75}
        />
      )}
    </div>
  );
}
