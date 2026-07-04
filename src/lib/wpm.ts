import { MAX_WPM, MIN_WPM } from '../types/reader'

/** Floor so short headings don't flash by instantly. */
const MIN_BLOCK_DURATION_MS = 800

export function clampWpm(wpm: number): number {
  return Math.min(MAX_WPM, Math.max(MIN_WPM, wpm))
}

export function wordsToDurationMs(wordCount: number, wpm: number): number {
  return Math.max(MIN_BLOCK_DURATION_MS, (wordCount / wpm) * 60_000)
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).length
}

/** SpeechSynthesisUtterance.rate=1 reads at ~150 wpm; clamp to stay intelligible. */
const SPEECH_BASE_WPM = 150

export function wpmToSpeechRate(wpm: number): number {
  return Math.min(3, Math.max(0.5, wpm / SPEECH_BASE_WPM))
}
