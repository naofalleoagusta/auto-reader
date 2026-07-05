import type { Book, LibraryEntry } from './book'

export type ThemeMode = 'light' | 'sepia' | 'deep-dark'
export type FontFamilyOption = 'serif' | 'sans'

export interface FontSettings {
  /** px, range ~14-28 */
  fontSize: number
  /** unitless multiplier, range ~1.3-2.0 */
  lineHeight: number
  fontFamily: FontFamilyOption
}

export interface ReadingPosition {
  chapterIndex: number
  blockIndex: number
}

export const MIN_WPM = 80
export const MAX_WPM = 600

export interface ReaderState {
  book: Book | null
  position: ReadingPosition
  /** Index into the active block's word array (see lib/wpm.ts splitWords).
   * Reset to 0 whenever position changes. Drives per-word highlighting. */
  currentWordIndex: number
  isReading: boolean
  readingSpeedWpm: number
  font: FontSettings
  theme: ThemeMode
  isSidebarOpen: boolean
  isCommandPaletteOpen: boolean
  isSpeechEnabled: boolean
  /** In-memory cache of IndexedDB's library store, refreshed via refreshLibrary(). */
  library: LibraryEntry[]
  /** Persisted (localStorage) — which book to auto-reopen on next load. */
  lastOpenedBookId: string | null
}

export interface ReaderActions {
  loadBook: (book: Book) => void
  closeBook: () => void

  /** Refreshes the in-memory library cache from IndexedDB. */
  refreshLibrary: () => Promise<void>
  /** Loads a previously saved book from IndexedDB, restoring its saved position. */
  openBookFromLibrary: (id: string) => Promise<void>
  /** Deletes one book from IndexedDB and the library cache; closes it first if it's the open book. */
  removeBook: (id: string) => Promise<void>
  /** Deletes every saved book and closes the currently open one, if any. */
  clearLibrary: () => Promise<void>

  setPosition: (position: ReadingPosition) => void
  /** Advances one block, rolling into the next chapter; pauses at end of book. */
  nextBlock: () => void
  /** Steps back one block, rolling into the previous chapter's last block. */
  prevBlock: () => void
  setWordIndex: (index: number) => void

  play: () => void
  pause: () => void
  togglePlay: () => void

  setSpeed: (wpm: number) => void
  adjustSpeed: (deltaWpm: number) => void

  setFontSize: (size: number) => void
  setLineHeight: (lineHeight: number) => void
  setFontFamily: (family: FontFamilyOption) => void

  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void

  toggleSpeech: () => void
  setSpeechEnabled: (enabled: boolean) => void
}

export type ReaderStore = ReaderState & ReaderActions
