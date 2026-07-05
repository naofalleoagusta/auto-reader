import { useEffect, useRef } from 'react'
import { useReaderState } from './state/useReaderState'
import { useAutoAdvance } from './hooks/useAutoAdvance'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useApplyTheme } from './hooks/useApplyTheme'
import { useTextToSpeech } from './hooks/useTextToSpeech'
import { useWakeLock } from './hooks/useWakeLock'
import { useMediaSession } from './hooks/useMediaSession'
import { useBookParser } from './hooks/useBookParser'
import { findLibraryEntryByFile, saveBook, updateLastPosition } from './lib/db'
import { DropZone } from './components/DropZone'
import { Sidebar } from './components/Sidebar'
import { ReaderCanvas } from './components/ReaderCanvas'
import { ControlBar } from './components/ControlBar'
import { CommandPalette } from './components/CommandPalette'
import { ConfirmDialog } from './components/ConfirmDialog'
import { SearchDialog } from './components/SearchDialog'

const ACCEPTED_EXTENSIONS = ['.epub', '.pdf']

export default function App() {
  useApplyTheme()
  useAutoAdvance()
  useKeyboardShortcuts()
  useTextToSpeech()
  useWakeLock()
  useMediaSession()

  // Only state that actually decides what App itself renders (the
  // DropZone/ReaderCanvas swap). Everything else — position, playback,
  // theme, library, dialog state — is read directly by the components that
  // use it via useReaderState selectors, not funneled through here. That's
  // what keeps this component from re-rendering on every word tick, and
  // why none of the child components below need props, memo, or callback
  // stabilization to avoid cascading re-renders.
  const book = useReaderState((s) => s.book)
  const lastOpenedBookId = useReaderState((s) => s.lastOpenedBookId)
  const loadBook = useReaderState((s) => s.loadBook)
  const refreshLibrary = useReaderState((s) => s.refreshLibrary)
  const openBookFromLibrary = useReaderState((s) => s.openBookFromLibrary)
  const setSidebarOpen = useReaderState((s) => s.setSidebarOpen)

  const { parseFile, isParsing, progress, error } = useBookParser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sidebar is a docked pane on desktop (lg:+) but a full-overlay drawer below
  // that — default it closed there so first load doesn't cover the screen.
  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore the last-open book (and its saved position) on refresh, and
  // populate the sidebar's recent-books list from IndexedDB.
  useEffect(() => {
    void refreshLibrary()
    if (lastOpenedBookId) void openBookFromLibrary(lastOpenedBookId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // setWordIndex throttles its own IndexedDB writes (see useReaderState) so
  // a refresh mid-throttle-window could lose up to ~1s of word progress —
  // flush the exact current word immediately when the page is hidden/closed.
  useEffect(() => {
    const flush = () => {
      const state = useReaderState.getState()
      if (state.book) void updateLastPosition(state.book.id, state.position, state.currentWordIndex)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  const handleFileAccepted = async (file: File) => {
    const existing = await findLibraryEntryByFile(file.name, file.size)
    if (existing) {
      await openBookFromLibrary(existing.id)
      setSidebarOpen(true)
      return
    }

    const parsedBook = await parseFile(file).catch(() => null)
    if (parsedBook) {
      await saveBook(parsedBook)
      loadBook(parsedBook)
      await refreshLibrary()
      setSidebarOpen(true)
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-ink">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFileAccepted(file)
          e.target.value = ''
        }}
      />

      <Sidebar onRequestOpenFile={() => fileInputRef.current?.click()} />

      <div className="flex min-w-0 flex-1 flex-col">
        {book ? (
          <ReaderCanvas />
        ) : (
          <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
            <DropZone
              onFileAccepted={handleFileAccepted}
              accept={ACCEPTED_EXTENSIONS}
              isLoading={isParsing}
              progress={progress}
              error={error}
              className="w-full max-w-md"
            />
          </div>
        )}

        <ControlBar />
      </div>

      <CommandPalette />
      <SearchDialog />
      <ConfirmDialog />
    </div>
  )
}
