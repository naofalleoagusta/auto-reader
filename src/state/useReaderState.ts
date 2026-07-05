import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReaderStore, ReadingPosition } from '../types/reader'
import { clampWpm } from '../lib/wpm'
import * as db from '../lib/db'

/** Throttle for persisting currentWordIndex during active playback — writing
 * on every word tick would hammer IndexedDB for no real benefit. */
const WORD_PERSIST_THROTTLE_MS = 1000
let lastWordPersistAt = 0

export const useReaderState = create<ReaderStore>()(
  persist(
    (set, get) => ({
      book: null,
      position: { chapterIndex: 0, blockIndex: 0 },
      currentWordIndex: 0,
      isReading: false,
      readingSpeedWpm: 150,
      font: { fontSize: 19, lineHeight: 1.7, fontFamily: 'serif' },
      theme: 'deep-dark',
      isSidebarOpen: true,
      isCommandPaletteOpen: false,
      isSearchOpen: false,
      isSpeechEnabled: true,
      library: [],
      lastOpenedBookId: null,
      confirmDialog: null,

      loadBook: (book) =>
        set({
          book,
          position: { chapterIndex: 0, blockIndex: 0 },
          currentWordIndex: 0,
          isReading: false,
          lastOpenedBookId: book.id,
        }),
      closeBook: () => set({ book: null, isReading: false }),

      refreshLibrary: async () => {
        const library = await db.getLibrary()
        set({ library })
      },

      openBookFromLibrary: async (id) => {
        const book = await db.getBook(id)
        if (!book) return
        const entry = await db.getLibraryEntry(id)
        set({
          book,
          position: entry?.lastPosition ?? { chapterIndex: 0, blockIndex: 0 },
          currentWordIndex: entry?.lastWordIndex ?? 0,
          isReading: false,
          lastOpenedBookId: id,
        })
      },

      removeBook: async (id) => {
        await db.deleteBook(id)
        const library = await db.getLibrary()
        const { book, lastOpenedBookId } = get()
        set({
          library,
          ...(book?.id === id ? { book: null, isReading: false } : {}),
          ...(lastOpenedBookId === id ? { lastOpenedBookId: null } : {}),
        })
      },

      clearLibrary: async () => {
        await db.clearLibrary()
        set({ library: [], book: null, isReading: false, lastOpenedBookId: null })
      },

      setPosition: (position) => {
        set({ position, currentWordIndex: 0 })
        const { book } = get()
        if (book) void db.updateLastPosition(book.id, position)
      },

      nextBlock: () => {
        const { book, position } = get()
        if (!book) return
        const chapter = book.chapters[position.chapterIndex]
        if (!chapter) return

        const persistAndSet = (next: ReadingPosition) => {
          set({ position: next, currentWordIndex: 0 })
          void db.updateLastPosition(book.id, next)
        }

        if (position.blockIndex + 1 < chapter.blocks.length) {
          persistAndSet({ chapterIndex: position.chapterIndex, blockIndex: position.blockIndex + 1 })
          return
        }

        const nextChapterIndex = position.chapterIndex + 1
        if (nextChapterIndex < book.chapters.length) {
          persistAndSet({ chapterIndex: nextChapterIndex, blockIndex: 0 })
          return
        }

        // Off the last block of the last chapter — stop.
        set({ isReading: false })
      },

      prevBlock: () => {
        const { book, position } = get()
        if (!book) return

        const persistAndSet = (next: ReadingPosition) => {
          set({ position: next, currentWordIndex: 0 })
          void db.updateLastPosition(book.id, next)
        }

        if (position.blockIndex > 0) {
          persistAndSet({ chapterIndex: position.chapterIndex, blockIndex: position.blockIndex - 1 })
          return
        }

        const prevChapterIndex = position.chapterIndex - 1
        if (prevChapterIndex >= 0) {
          const prevChapter = book.chapters[prevChapterIndex]
          const lastBlockIndex = Math.max(0, prevChapter.blocks.length - 1)
          persistAndSet({ chapterIndex: prevChapterIndex, blockIndex: lastBlockIndex })
        }
        // Already at the very first block — no-op.
      },

      setWordIndex: (currentWordIndex) => {
        set({ currentWordIndex })
        const { book, position } = get()
        if (!book) return
        const now = Date.now()
        if (now - lastWordPersistAt >= WORD_PERSIST_THROTTLE_MS) {
          lastWordPersistAt = now
          void db.updateLastPosition(book.id, position, currentWordIndex)
        }
      },

      play: () => set({ isReading: true }),
      pause: () => set({ isReading: false }),
      togglePlay: () => set((s) => ({ isReading: !s.isReading })),

      setSpeed: (wpm) => set({ readingSpeedWpm: clampWpm(wpm) }),
      adjustSpeed: (delta) => set((s) => ({ readingSpeedWpm: clampWpm(s.readingSpeedWpm + delta) })),

      setFontSize: (fontSize) => set((s) => ({ font: { ...s.font, fontSize } })),
      setLineHeight: (lineHeight) => set((s) => ({ font: { ...s.font, lineHeight } })),
      setFontFamily: (fontFamily) => set((s) => ({ font: { ...s.font, fontFamily } })),

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
      setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
      toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
      setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),

      toggleSpeech: () => set((s) => ({ isSpeechEnabled: !s.isSpeechEnabled })),
      setSpeechEnabled: (isSpeechEnabled) => set({ isSpeechEnabled }),

      requestConfirm: (confirmDialog) => set({ confirmDialog }),
      cancelConfirmDialog: () => set({ confirmDialog: null }),
    }),
    {
      name: 'auto-reader-settings',
      // Book content lives in IndexedDB (src/lib/db.ts), not localStorage —
      // only small preferences + "what to reopen" are persisted here.
      partialize: (state) => ({
        font: state.font,
        theme: state.theme,
        readingSpeedWpm: state.readingSpeedWpm,
        isSpeechEnabled: state.isSpeechEnabled,
        lastOpenedBookId: state.lastOpenedBookId,
      }),
    },
  ),
)
