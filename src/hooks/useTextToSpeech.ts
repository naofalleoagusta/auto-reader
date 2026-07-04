import { useEffect } from 'react'
import { useReaderState } from '../state/useReaderState'
import { wordsToDurationMs, wpmToSpeechRate } from '../lib/wpm'

/** Real speech duration varies by voice/engine/punctuation — give onend/onerror
 * a generous head start over the word-count estimate before forcing advance. */
const SAFETY_NET_MULTIPLIER = 4

/**
 * When narration is on, this hook is the pacing driver: it advances to the
 * next block when the browser actually finishes speaking the current one
 * (utterance.onend), not from a word-count estimate — so long paragraphs
 * don't leave dead silence and short ones don't get cut off mid-sentence.
 * useAutoAdvance defers to this hook whenever isSpeechEnabled is true.
 *
 * A safety-net timeout force-advances if onend/onerror never fires (e.g. a
 * platform with no voices installed — playback must not hang forever).
 */
export function useTextToSpeech(): void {
  const isReading = useReaderState((s) => s.isReading)
  const isSpeechEnabled = useReaderState((s) => s.isSpeechEnabled)
  const book = useReaderState((s) => s.book)
  const position = useReaderState((s) => s.position)
  const wpm = useReaderState((s) => s.readingSpeedWpm)
  const nextBlock = useReaderState((s) => s.nextBlock)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel()

    if (!isReading || !isSpeechEnabled || !book) return

    const block = book.chapters[position.chapterIndex]?.blocks[position.blockIndex]
    if (!block) return

    let settled = false
    const advanceOnce = () => {
      if (settled) return
      settled = true
      nextBlock()
    }

    const utterance = new SpeechSynthesisUtterance(block.text)
    utterance.rate = wpmToSpeechRate(wpm)
    utterance.onend = advanceOnce
    utterance.onerror = advanceOnce

    // Chrome/WebKit can silently stall for seconds when speak() fires in the
    // same tick as cancel() (stuck-queue bug) — deferring one tick avoids it.
    const speakTimeoutId = window.setTimeout(() => {
      window.speechSynthesis.speak(utterance)
    }, 50)

    const safetyTimeoutId = window.setTimeout(
      advanceOnce,
      wordsToDurationMs(block.wordCount, wpm) * SAFETY_NET_MULTIPLIER,
    )

    return () => {
      // Mark settled first so our own cancel() below can't trigger a second,
      // spurious advance via onend/onerror firing on the canceled utterance.
      settled = true
      window.clearTimeout(speakTimeoutId)
      window.clearTimeout(safetyTimeoutId)
      window.speechSynthesis.cancel()
    }
  }, [isReading, isSpeechEnabled, book, position.chapterIndex, position.blockIndex, wpm, nextBlock])
}
