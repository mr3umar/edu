import { useMemo } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, List } from 'lucide-react';

import { useBook } from '../api/book/hook';
import { cn } from '../lib/utils';
import type { BookM, PageM } from '../domain';
import { useDocumentLang } from '../lib/useDocumentLang';

type SectionM = BookM['sections'][number];

// A page carries a sectionId only on the page where that section starts
// (per the reader's data model, most pages in a section leave it unset).
// It links to the section's `id`, not its `uid`.
function pageMatchesSection(page: PageM | undefined, section: SectionM): boolean {
  return !!page?.sectionId && page.sectionId === section.id;
}

// Book sections, shown in the reader header — pick one to jump to its first
// page. Also doubles as the "current section" label, resolved to the
// nearest section whose first page is at or before the page being viewed
// (not only the exact marker page) so it stays accurate while paging
// through the middle of a section.
export default function SectionSelector() {
  const { book, currentPageIndex, setCurrentPageIndex } = useBook();
  // UI labels follow the session language; section titles are the book's own.
  const isEnglish = useDocumentLang() === 'en';

  const sections = useMemo(
    () => [...(book?.sections ?? [])].sort((a, b) => a.index - b.index),
    [book?.sections]
  );

  const firstPageIndexBySection = useMemo(() => {
    const map = new Map<string, number>();
    if (!book) return map;
    for (const section of sections) {
      const index = book.pages.findIndex((p: PageM) => pageMatchesSection(p, section));
      if (index >= 0) map.set(section.id, index);
    }
    return map;
  }, [book, sections]);

  const currentSection = useMemo(() => {
    const pageIndex = currentPageIndex ?? 0;
    let current: SectionM | undefined;
    let bestStart = -1;
    for (const section of sections) {
      const start = firstPageIndexBySection.get(section.id);
      if (start === undefined || start > pageIndex) continue;
      if (start > bestStart) {
        bestStart = start;
        current = section;
      }
    }
    return current;
  }, [sections, firstPageIndexBySection, currentPageIndex]);

  const sectionLabel = (section: SectionM, index: number) =>
    section.title?.trim() || (isEnglish ? `Section ${index + 1}` : `القسم ${index + 1}`);

  const goToSection = (section: SectionM) => {
    const firstPageIndex = firstPageIndexBySection.get(section.id);
    if (firstPageIndex !== undefined) setCurrentPageIndex(firstPageIndex);
  };

  if (!book || sections.length === 0) return null;

  const currentIndex = currentSection ? sections.indexOf(currentSection) : -1;
  const triggerLabel =
    currentIndex >= 0 ? sectionLabel(sections[currentIndex], currentIndex) : isEnglish ? 'Sections' : 'الأقسام';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={isEnglish ? 'Choose section' : 'اختر القسم'}
          className="flex h-9 max-w-[200px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-text-muted outline-none transition-colors hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-accent-400 data-[state=open]:bg-surface-2 data-[state=open]:text-text sm:max-w-[260px]"
        >
          <List className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 max-h-[60vh] w-72 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-e2"
        >
          {sections.map((section, index) => {
            const isActive = section.id === currentSection?.id;
            return (
              <DropdownMenu.Item
                key={section.uid}
                onSelect={() => goToSection(section)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[14px] outline-none transition-colors',
                  isActive ? 'bg-accent-100 font-semibold text-accent-700' : 'text-text hover:bg-surface-2'
                )}
              >
                <span className="truncate">{sectionLabel(section, index)}</span>
                {isActive && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
