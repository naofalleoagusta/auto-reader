import { useEffect } from 'react'
import { useReaderState } from '../state/useReaderState'
import { wordsToDurationMs } from '../lib/wpm'

/**
 * Drives WPM-based auto-advance via requestAnimationFrame rather than
 * setInterval — rAF pauses naturally in background tabs (correct behavior
 * for a reader) and avoids the drift/throttling setInterval suffers under.
 *
 * Only paces silent (non-narrated) reading. When narration is on,
 * useTextToSpeech is the pacing driver instead — it advances on the
 * browser's actual speech-completion event, which a word-count estimate
 * can't match (paragraphs would pause too long or cut narration off early).
 *
 * Known simplification: changing speed mid-block restarts that block's
 * timer at the new speed rather than prorating remaining time.
 */
export function useAutoAdvance(): void {
  const isReading = useReaderState((s) => s.isReading)
  const isSpeechEnabled = useReaderState((s) => s.isSpeechEnabled)
  const book = useReaderState((s) => s.book)
  const position = useReaderState((s) => s.position)
  const wpm = useReaderState((s) => s.readingSpeedWpm)
  const nextBlock = useReaderState((s) => s.nextBlock)

  useEffect(() => {
    if (!isReading || isSpeechEnabled || !book) return
    const currentBlock = book.chapters[position.chapterIndex]?.blocks[position.blockIndex]
    if (!currentBlock) return

    const durationMs = wordsToDurationMs(currentBlock.wordCount, wpm)
    let rafId: number
    let start: number | null = null

    const frame = (ts: number) => {
      if (start === null) start = ts
      if (ts - start >= durationMs) {
        nextBlock()
        return
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [isReading, isSpeechEnabled, book, position.chapterIndex, position.blockIndex, wpm, nextBlock])
}
