import { memo } from 'react'
import type { Book, LibraryEntry } from '../types/book'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  book: Book | null
  currentChapterIndex: number
  onSelectChapter: (chapterIndex: number) => void
  onRequestOpenFile: () => void
  library: LibraryEntry[]
  onSelectLibraryBook: (id: string) => void
  onDeleteLibraryBook: (id: string) => void
  onClearLibrary: () => void
}

export const Sidebar = memo(function Sidebar({
  isOpen,
  onClose,
  book,
  currentChapterIndex,
  onSelectChapter,
  onRequestOpenFile,
  library,
  onSelectLibraryBook,
  onDeleteLibraryBook,
  onClearLibrary,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-line bg-surface font-mono transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-[11px] tracking-[0.2em] text-muted">CATALOG</span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={onRequestOpenFile}
          className="mx-4 mt-3 mb-4 border border-line px-3 py-2 text-left text-[11px] tracking-wider text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          + OPEN FILE
        </button>

        {library.length > 0 && (
          <div className="mb-4 border-b border-line pb-4">
            <div className="mb-1 flex items-center justify-between px-4">
              <p className="text-[11px] tracking-wider text-muted">RECENT</p>
              <button
                type="button"
                onClick={onClearLibrary}
                className="text-[10px] tracking-wider text-muted transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                CLEAR ALL
              </button>
            </div>
            <nav className="flex flex-col">
              {library.map((entry) => {
                const isActive = entry.id === book?.id
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center border-l-2 pr-1 transition-colors ${
                      isActive ? 'border-accent bg-canvas' : 'border-transparent hover:border-line hover:bg-canvas/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectLibraryBook(entry.id)}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <span className={`truncate font-serif text-sm not-italic ${isActive ? 'text-accent' : 'text-ink'}`}>
                        {entry.title}
                      </span>
                      <span className="truncate text-[10px] uppercase tracking-wider text-muted">{entry.format}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLibraryBook(entry.id)}
                      aria-label={`Delete ${entry.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </nav>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-4">
          {book ? (
            <>
              <div className="mb-3 px-4">
                <p className="truncate font-serif text-base text-ink">{book.title}</p>
                {book.author && <p className="truncate font-serif text-sm italic text-muted">{book.author}</p>}
              </div>
              <nav className="flex flex-col">
                {book.chapters.map((chapter, index) => {
                  const isActive = index === currentChapterIndex
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => onSelectChapter(index)}
                      className={`flex items-baseline gap-3 border-l-2 px-4 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                        isActive
                          ? 'border-accent bg-canvas text-accent'
                          : 'border-transparent text-muted hover:border-line hover:text-ink'
                      }`}
                    >
                      <span className="shrink-0 tabular-nums text-[11px] text-muted">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="line-clamp-1 font-serif not-italic">{chapter.title}</span>
                    </button>
                  )
                })}
              </nav>
            </>
          ) : (
            <p className="px-4 text-[13px] text-muted">No book loaded.</p>
          )}
        </div>
      </aside>
    </>
  )
})
