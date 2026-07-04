import type { Book, BookMetadata } from './book'

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
  isReading: boolean
  readingSpeedWpm: number
  font: FontSettings
  theme: ThemeMode
  isSidebarOpen: boolean
  isCommandPaletteOpen: boolean
  isSpeechEnabled: boolean
  /** Session-only — no persistence in this scaffold. */
  recentBooks: BookMetadata[]
}

export interface ReaderActions {
  loadBook: (book: Book) => void
  closeBook: () => void

  setPosition: (position: ReadingPosition) => void
  /** Advances one block, rolling into the next chapter; pauses at end of book. */
  nextBlock: () => void
  /** Steps back one block, rolling into the previous chapter's last block. */
  prevBlock: () => void

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
