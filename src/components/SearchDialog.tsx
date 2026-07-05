import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { Book, LibraryEntry } from '../types/book'

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
  book: Book | null
  library: LibraryEntry[]
  onSelectLibraryBook: (id: string) => void
  onJumpToBlock: (chapterIndex: number, blockIndex: number) => void
}

interface TextMatch {
  chapterIndex: number
  blockIndex: number
  chapterTitle: string
  before: string
  match: string
  after: string
}

const MAX_TEXT_MATCHES = 30
const SNIPPET_RADIUS = 40

function findTextMatches(book: Book | null, query: string): TextMatch[] {
  if (!book || !query) return []
  const lower = query.toLowerCase()
  const matches: TextMatch[] = []

  for (const chapter of book.chapters) {
    for (const block of chapter.blocks) {
      const index = block.text.toLowerCase().indexOf(lower)
      if (index === -1) continue
      matches.push({
        chapterIndex: chapter.index,
        blockIndex: block.index,
        chapterTitle: chapter.title,
        before: block.text.slice(Math.max(0, index - SNIPPET_RADIUS), index),
        match: block.text.slice(index, index + query.length),
        after: block.text.slice(index + query.length, index + query.length + SNIPPET_RADIUS),
      })
      if (matches.length >= MAX_TEXT_MATCHES) return matches
    }
  }
  return matches
}

function findLibraryMatches(library: LibraryEntry[], query: string): LibraryEntry[] {
  if (!query) return []
  const lower = query.toLowerCase()
  return library.filter(
    (entry) => entry.title.toLowerCase().includes(lower) || entry.author?.toLowerCase().includes(lower),
  )
}

export const SearchDialog = memo(function SearchDialog({
  isOpen,
  onClose,
  book,
  library,
  onSelectLibraryBook,
  onJumpToBlock,
}: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      // Focus after the dialog actually mounts into the DOM.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [isOpen, onClose])

  const trimmedQuery = query.trim()
  const libraryMatches = useMemo(() => findLibraryMatches(library, trimmedQuery), [library, trimmedQuery])
  const textMatches = useMemo(() => findTextMatches(book, trimmedQuery), [book, trimmedQuery])

  if (!isOpen) return null

  const hasResults = libraryMatches.length > 0 || textMatches.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[10vh]" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col border border-line bg-surface font-mono shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 shrink-0 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, or a word in this book…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="shrink-0 border border-line px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>

        <div className="overflow-y-auto">
          {trimmedQuery === '' ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">
              Type to search your library or the open book's text.
            </p>
          ) : !hasResults ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">No matches for "{trimmedQuery}".</p>
          ) : (
            <>
              {libraryMatches.length > 0 && (
                <div className="border-b border-line py-2">
                  <p className="px-4 pb-1 text-[11px] tracking-wider text-muted">BOOKS</p>
                  <nav className="flex flex-col">
                    {libraryMatches.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          onSelectLibraryBook(entry.id)
                          onClose()
                        }}
                        className="flex flex-col gap-0.5 px-4 py-1.5 text-left transition-colors hover:bg-canvas/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <span className="truncate font-serif text-sm not-italic text-ink">{entry.title}</span>
                        <span className="truncate text-[10px] uppercase tracking-wider text-muted">
                          {entry.author ?? entry.format}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {textMatches.length > 0 && (
                <div className="py-2">
                  <p className="px-4 pb-1 text-[11px] tracking-wider text-muted">IN THIS BOOK</p>
                  <nav className="flex flex-col">
                    {textMatches.map((m, i) => (
                      <button
                        key={`${m.chapterIndex}-${m.blockIndex}-${i}`}
                        type="button"
                        onClick={() => {
                          onJumpToBlock(m.chapterIndex, m.blockIndex)
                          onClose()
                        }}
                        className="flex flex-col gap-0.5 px-4 py-1.5 text-left transition-colors hover:bg-canvas/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <span className="truncate text-[10px] uppercase tracking-wider text-muted">
                          {m.chapterTitle}
                        </span>
                        <span className="truncate font-serif text-sm not-italic text-ink">
                          …{m.before}
                          <span className="bg-accent/30 text-ink">{m.match}</span>
                          {m.after}…
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})
