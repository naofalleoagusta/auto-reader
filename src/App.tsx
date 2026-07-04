import { useCallback, useEffect, useRef } from 'react'
import { useReaderState } from './state/useReaderState'
import { useAutoAdvance } from './hooks/useAutoAdvance'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useApplyTheme } from './hooks/useApplyTheme'
import { useTextToSpeech } from './hooks/useTextToSpeech'
import { useBookParser } from './hooks/useBookParser'
import { findLibraryEntryByFile, saveBook } from './lib/db'
import { DropZone } from './components/DropZone'
import { Sidebar } from './components/Sidebar'
import { ReaderCanvas } from './components/ReaderCanvas'
import { ControlBar } from './components/ControlBar'
import { CommandPalette } from './components/CommandPalette'

const ACCEPTED_EXTENSIONS = ['.epub', '.pdf']

export default function App() {
  useApplyTheme()
  useAutoAdvance()
  useKeyboardShortcuts()
  useTextToSpeech()

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

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
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
        onClose={() => setSidebarOpen(false)}
        book={book}
        currentChapterIndex={position.chapterIndex}
        onSelectChapter={(chapterIndex) => setPosition({ chapterIndex, blockIndex: 0 })}
        onRequestOpenFile={() => fileInputRef.current?.click()}
        library={library}
        onSelectLibraryBook={(id) => {
          void openBookFromLibrary(id)
          setSidebarOpen(true)
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {book ? (
          <ReaderCanvas
            book={book}
            position={position}
            currentWordIndex={currentWordIndex}
            font={font}
            isReading={isReading}
            onBlockClick={(blockIndex) => setPosition({ chapterIndex: position.chapterIndex, blockIndex })}
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
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleSidebar={toggleSidebar}
          isSpeechEnabled={isSpeechEnabled}
          onToggleSpeech={toggleSpeech}
          chapterProgress={{
            chapterIndex: position.chapterIndex,
            totalChapters: book?.chapters.length ?? 0,
          }}
          blockProgress={{
            blockIndex: position.blockIndex,
            totalBlocks: chapter?.blocks.length ?? 0,
          }}
        />
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        font={font}
        onFontFamilyChange={setFontFamily}
        onFontSizeChange={setFontSize}
        onLineHeightChange={setLineHeight}
        readingSpeedWpm={readingSpeedWpm}
        onSpeedChange={setSpeed}
      />
    </div>
  )
}
