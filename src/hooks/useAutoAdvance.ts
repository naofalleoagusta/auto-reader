import { useEffect, useRef } from 'react'
import { useReaderState } from '../state/useReaderState'
import { wordsToDurationMs } from '../lib/wpm'

/** Tick cadence for the pacing loop — plenty fine-grained for per-word
 * highlighting without hammering a throttled background timer. */
const TICK_MS = 120

/**
 * Drives WPM-based auto-advance via setTimeout. Deliberately *not*
 * requestAnimationFrame: rAF fully stops firing when the tab is hidden
 * (backgrounded/phone locked) — great for not burning CPU while idle in the
 * foreground, but wrong for "keep reading while the phone is locked," which
 * is the actual requirement here. setTimeout only gets throttled in that
 * situation (clamped to roughly 1s+ under aggressive backgrounding), it
 * doesn't stop — pacing gets coarser while backgrounded, but keeps going.
 *
 * Only paces silent (non-narrated) reading. When narration is on,
 * useTextToSpeech is the pacing driver instead — it advances on the
 * browser's actual speech-completion event, which a word-count estimate
 * can't match (paragraphs would pause too long or cut narration off early).
 *
 * Elapsed time within the current block persists across a pure pause (via
 * elapsedRef) so resuming continues from the same word instead of
 * restarting the paragraph. Changing wpm still restarts the block's timer
 * from scratch (elapsedRef resets whenever wpm changes) — same documented
 * simplification as before, just no longer conflated with pause/resume.
 *
 * Also drives per-word highlighting in silent mode by subdividing the
 * block's duration evenly across its words (uniform per-word duration —
 * simpler than weighting by word length, and close enough for a highlight
 * cue rather than a precise timing guarantee).
 */
export function useAutoAdvance(): void {
  const isReading = useReaderState((s) => s.isReading)
  const isSpeechEnabled = useReaderState((s) => s.isSpeechEnabled)
  const book = useReaderState((s) => s.book)
  const position = useReaderState((s) => s.position)
  const wpm = useReaderState((s) => s.readingSpeedWpm)
  const nextBlock = useReaderState((s) => s.nextBlock)
  const setWordIndex = useReaderState((s) => s.setWordIndex)

  const elapsedRef = useRef(0)
  const blockKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (isSpeechEnabled || !book) return
    const currentBlock = book.chapters[position.chapterIndex]?.blocks[position.blockIndex]
    if (!currentBlock) return

    const durationMs = wordsToDurationMs(currentBlock.wordCount, wpm)
    const wordCount = Math.max(1, currentBlock.wordCount)
    const perWordDurationMs = durationMs / wordCount

    const key = `${position.chapterIndex}:${position.blockIndex}:${wpm}`
    if (blockKeyRef.current !== key) {
      blockKeyRef.current = key
      elapsedRef.current = 0
    }

    // Paused — keep elapsedRef as-is (set by the previous run's cleanup) and
    // don't start a timer; resuming will pick up from here.
    if (!isReading) return

    let timeoutId: number
    let segmentStart = performance.now()
    let hasAdvanced = false
    let lastWordIndex = Math.min(wordCount - 1, Math.floor(elapsedRef.current / perWordDurationMs))

    const tick = () => {
      const totalElapsed = elapsedRef.current + (performance.now() - segmentStart)

      if (totalElapsed >= durationMs) {
        hasAdvanced = true
        elapsedRef.current = 0
        blockKeyRef.current = null
        // A manual jump (e.g. clicking a block) could have moved position
        // out from under this timer since it was scheduled — only advance
        // from the position this tick actually belongs to, otherwise
        // nextBlock() would advance from wherever the click just landed,
        // overshooting it by one.
        const current = useReaderState.getState().position
        if (current.chapterIndex === position.chapterIndex && current.blockIndex === position.blockIndex) {
          nextBlock()
        }
        return
      }

      const wordIndex = Math.min(wordCount - 1, Math.floor(totalElapsed / perWordDurationMs))
      if (wordIndex !== lastWordIndex) {
        lastWordIndex = wordIndex
        setWordIndex(wordIndex)
      }
      timeoutId = window.setTimeout(tick, TICK_MS)
    }
    timeoutId = window.setTimeout(tick, TICK_MS)

    return () => {
      window.clearTimeout(timeoutId)
      // Bank the elapsed time from this segment so pausing (or any other
      // dep change) doesn't lose progress — unless we just advanced past
      // the block ourselves, in which case it's already reset for the next one.
      if (!hasAdvanced) {
        elapsedRef.current += performance.now() - segmentStart
      }
    }
  }, [isReading, isSpeechEnabled, book, position.chapterIndex, position.blockIndex, wpm, nextBlock, setWordIndex])
}
