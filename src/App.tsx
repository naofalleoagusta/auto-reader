import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const ACCEPTED_EXTENSIONS = ['.epub', '.pdf']

export default function App() {
  useApplyTheme()
  useAutoAdvance()
  useKeyboardShortcuts()
  useTextToSpeech()
  useWakeLock()
  useMediaSession()

  const book = useReaderState((s) => s.book)
  const position = useReaderState((s) => s.position)
  const isReading = useReaderState((s) => s.isReading)
  const readingSpeedWpm = useReaderState((s) => s.readingSpeedWpm)
  const font = useReaderState((s) => s.font)
  const theme = useReaderState((s) => s.theme)
  const isSidebarOpen = useReaderState((s) => s.isSidebarOpen)
  const isCommandPaletteOpen = useReaderState((s) => s.isCommandPaletteOpen)
  const isSpeechEnabled = useReaderState((s) => s.isSpeechEnabled)
  const currentWordIndex = useReaderState((s) => s.currentWordIndex)
  const library = useReaderState((s) => s.library)
  const lastOpenedBookId = useReaderState((s) => s.lastOpenedBookId)

  const loadBook = useReaderState((s) => s.loadBook)
  const refreshLibrary = useReaderState((s) => s.refreshLibrary)
  const openBookFromLibrary = useReaderState((s) => s.openBookFromLibrary)
  const removeBook = useReaderState((s) => s.removeBook)
  const clearLibrary = useReaderState((s) => s.clearLibrary)
  const setPosition = useReaderState((s) => s.setPosition)
  const togglePlay = useReaderState((s) => s.togglePlay)
  const nextBlock = useReaderState((s) => s.nextBlock)
  const prevBlock = useReaderState((s) => s.prevBlock)
  const setSpeed = useReaderState((s) => s.setSpeed)
  const setFontFamily = useReaderState((s) => s.setFontFamily)
  const setFontSize = useReaderState((s) => s.setFontSize)
  const setLineHeight = useReaderState((s) => s.setLineHeight)
  const setTheme = useReaderState((s) => s.setTheme)
  const toggleSidebar = useReaderState((s) => s.toggleSidebar)
  const setSidebarOpen = useReaderState((s) => s.setSidebarOpen)
  const setCommandPaletteOpen = useReaderState((s) => s.setCommandPaletteOpen)
  const toggleSpeech = useReaderState((s) => s.toggleSpeech)

  const { parseFile, isParsing, progress, error } = useBookParser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

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

  const handleFileAccepted = useCallback(
    async (file: File) => {
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
    },
    [parseFile, loadBook, setSidebarOpen, openBookFromLibrary, refreshLibrary],
  )

  const chapter = book?.chapters[position.chapterIndex]

  // Stabilized so Sidebar/ControlBar/CommandPalette (all React.memo) and
  // ReaderCanvas's per-block memoization actually skip re-rendering on the
  // frequent currentWordIndex ticks — inline arrow props would defeat memo
  // every time regardless of whether anything visually changed.
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen])
  const handleSelectChapter = useCallback(
    (chapterIndex: number) => setPosition({ chapterIndex, blockIndex: 0 }),
    [setPosition],
  )
  const handleRequestOpenFile = useCallback(() => fileInputRef.current?.click(), [])
  const handleSelectLibraryBook = useCallback(
    (id: string) => {
      void openBookFromLibrary(id)
      setSidebarOpen(true)
    },
    [openBookFromLibrary, setSidebarOpen],
  )
  const handleDeleteLibraryBook = useCallback(
    (id: string) => {
      const entry = library.find((e) => e.id === id)
      setConfirmDialog({
        title: 'Delete book',
        message: `Delete "${entry?.title ?? 'this book'}"? This can't be undone.`,
        confirmLabel: 'Delete',
        onConfirm: () => {
          void removeBook(id)
          setConfirmDialog(null)
        },
      })
    },
    [library, removeBook],
  )
  const handleClearLibrary = useCallback(() => {
    setConfirmDialog({
      title: 'Clear library',
      message: "Delete all saved books? This can't be undone.",
      confirmLabel: 'Delete all',
      onConfirm: () => {
        void clearLibrary()
        setConfirmDialog(null)
      },
    })
  }, [clearLibrary])
  const handleCancelConfirm = useCallback(() => setConfirmDialog(null), [])
  const handleOpenCommandPalette = useCallback(() => setCommandPaletteOpen(true), [setCommandPaletteOpen])
  const handleCloseCommandPalette = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen])
  const handleBlockClick = useCallback(
    (blockIndex: number) => setPosition({ chapterIndex: position.chapterIndex, blockIndex }),
    [setPosition, position.chapterIndex],
  )

  const chapterProgress = useMemo(
    () => ({ chapterIndex: position.chapterIndex, totalChapters: book?.chapters.length ?? 0 }),
    [position.chapterIndex, book?.chapters.length],
  )
  const blockProgress = useMemo(
    () => ({ blockIndex: position.blockIndex, totalBlocks: chapter?.blocks.length ?? 0 }),
    [position.blockIndex, chapter?.blocks.length],
  )

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

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        book={book}
        currentChapterIndex={position.chapterIndex}
        onSelectChapter={handleSelectChapter}
        onRequestOpenFile={handleRequestOpenFile}
        library={library}
        onSelectLibraryBook={handleSelectLibraryBook}
        onDeleteLibraryBook={handleDeleteLibraryBook}
        onClearLibrary={handleClearLibrary}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {book ? (
          <ReaderCanvas
            book={book}
            position={position}
            currentWordIndex={currentWordIndex}
            font={font}
            isReading={isReading}
            onBlockClick={handleBlockClick}
          />
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

        <ControlBar
          isReading={isReading}
          onTogglePlay={togglePlay}
          readingSpeedWpm={readingSpeedWpm}
          onSpeedChange={setSpeed}
          onSkipPrev={prevBlock}
          onSkipNext={nextBlock}
          onOpenCommandPalette={handleOpenCommandPalette}
          onToggleSidebar={toggleSidebar}
          isSpeechEnabled={isSpeechEnabled}
          onToggleSpeech={toggleSpeech}
          chapterProgress={chapterProgress}
          blockProgress={blockProgress}
        />
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
        theme={theme}
        onThemeChange={setTheme}
        font={font}
        onFontFamilyChange={setFontFamily}
        onFontSizeChange={setFontSize}
        onLineHeightChange={setLineHeight}
        readingSpeedWpm={readingSpeedWpm}
        onSpeedChange={setSpeed}
      />

      <ConfirmDialog
        isOpen={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirm'}
        onConfirm={confirmDialog?.onConfirm ?? handleCancelConfirm}
        onCancel={handleCancelConfirm}
      />
    </div>
  )
}
