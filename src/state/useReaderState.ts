import { create } from 'zustand'
import type { ReaderStore } from '../types/reader'
import { clampWpm } from '../lib/wpm'

export const useReaderState = create<ReaderStore>((set, get) => ({
  book: null,
  position: { chapterIndex: 0, blockIndex: 0 },
  isReading: false,
  readingSpeedWpm: 150,
  font: { fontSize: 19, lineHeight: 1.7, fontFamily: 'serif' },
  theme: 'deep-dark',
  isSidebarOpen: true,
  isCommandPaletteOpen: false,
  isSpeechEnabled: true,
  recentBooks: [],

  loadBook: (book) =>
    set({ book, position: { chapterIndex: 0, blockIndex: 0 }, isReading: false }),
  closeBook: () => set({ book: null, isReading: false }),

  setPosition: (position) => set({ position }),

  nextBlock: () => {
    const { book, position } = get()
    if (!book) return
    const chapter = book.chapters[position.chapterIndex]
    if (!chapter) return

    if (position.blockIndex + 1 < chapter.blocks.length) {
      set({ position: { chapterIndex: position.chapterIndex, blockIndex: position.blockIndex + 1 } })
      return
    }

    const nextChapterIndex = position.chapterIndex + 1
    if (nextChapterIndex < book.chapters.length) {
      set({ position: { chapterIndex: nextChapterIndex, blockIndex: 0 } })
      return
    }

    // Off the last block of the last chapter — stop.
    set({ isReading: false })
  },

  prevBlock: () => {
    const { book, position } = get()
    if (!book) return

    if (position.blockIndex > 0) {
      set({ position: { chapterIndex: position.chapterIndex, blockIndex: position.blockIndex - 1 } })
      return
    }

    const prevChapterIndex = position.chapterIndex - 1
    if (prevChapterIndex >= 0) {
      const prevChapter = book.chapters[prevChapterIndex]
      const lastBlockIndex = Math.max(0, prevChapter.blocks.length - 1)
      set({ position: { chapterIndex: prevChapterIndex, blockIndex: lastBlockIndex } })
    }
    // Already at the very first block — no-op.
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

  toggleSpeech: () => set((s) => ({ isSpeechEnabled: !s.isSpeechEnabled })),
  setSpeechEnabled: (isSpeechEnabled) => set({ isSpeechEnabled }),
}))
