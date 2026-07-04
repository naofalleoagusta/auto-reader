import { useEffect, useRef } from 'react'
import { useReaderState } from '../state/useReaderState'
import { wordsToDurationMs, wpmToSpeechRate } from '../lib/wpm'

/** Real speech duration varies by voice/engine/punctuation — give onend/onerror
 * a generous head start over the word-count estimate before forcing advance. */
const SAFETY_NET_MULTIPLIER = 4

/** Start character offset of each word in `text`, aligned with lib/wpm.ts's
 * splitWords tokenization (runs of non-whitespace) — used to map an
 * utterance's onboundary charIndex to a word index. */
function wordStartOffsets(text: string): number[] {
  const offsets: number[] = []
  const wordPattern = /\S+/g
  let match: RegExpExecArray | null
  while ((match = wordPattern.exec(text))) {
    offsets.push(match.index)
  }
  return offsets
}

function positionKey(chapterIndex: number, blockIndex: number): string {
  return `${chapterIndex}:${blockIndex}`
}

/**
 * When narration is on, this hook is the pacing driver: it advances to the
 * next block when the browser actually finishes speaking the current one
 * (utterance.onend), not from a word-count estimate — so long paragraphs
 * don't leave dead silence and short ones don't get cut off mid-sentence.
 * useAutoAdvance defers to this hook whenever isSpeechEnabled is true.
 *
 * It also drives per-word highlighting via the utterance's onboundary event,
 * and — the reason state lives in refs rather than only effect closures —
 * supports true pause/resume: pausing calls the native speechSynthesis.pause()
 * instead of cancelling, so resuming continues from the exact word rather
 * than restarting the whole paragraph. A fresh utterance is only built when
 * the content actually changes (block/position/wpm/narration toggle), or
 * when resuming can't reuse the paused utterance (e.g. the user skipped via
 * prev/next while paused).
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
  const setWordIndex = useReaderState((s) => s.setWordIndex)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const pausedKeyRef = useRef<string | null>(null)
  const speakTimeoutRef = useRef<number | null>(null)
  const safetyTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const clearTimers = () => {
      if (speakTimeoutRef.current !== null) window.clearTimeout(speakTimeoutRef.current)
      if (safetyTimeoutRef.current !== null) window.clearTimeout(safetyTimeoutRef.current)
      speakTimeoutRef.current = null
      safetyTimeoutRef.current = null
    }

    const key = positionKey(position.chapterIndex, position.blockIndex)
    const hasMatchingUtterance = utteranceRef.current !== null && pausedKeyRef.current === key

    if (!isReading) {
      clearTimers()
      if (hasMatchingUtterance) {
        // Pure pause — leave the utterance in place so resume() continues
        // from the exact word instead of restarting the paragraph.
        window.speechSynthesis.pause()
      } else {
        window.speechSynthesis.cancel()
        utteranceRef.current = null
        pausedKeyRef.current = null
      }
      return
    }

    if (!isSpeechEnabled || !book) {
      clearTimers()
      window.speechSynthesis.cancel()
      utteranceRef.current = null
      pausedKeyRef.current = null
      return
    }

    const block = book.chapters[position.chapterIndex]?.blocks[position.blockIndex]
    if (!block) return

    if (hasMatchingUtterance) {
      // Resuming at the same block we paused on.
      window.speechSynthesis.resume()
      return
    }

    // Fresh content — tear down anything stale and speak from the top of
    // this block. (A wpm change while paused won't retroactively change an
    // in-flight utterance's rate; same documented simplification as
    // useAutoAdvance's mid-block speed restart.)
    clearTimers()
    window.speechSynthesis.cancel()

    let settled = false
    const advanceOnce = () => {
      if (settled) return
      settled = true
      utteranceRef.current = null
      pausedKeyRef.current = null
      nextBlock()
    }

    const utterance = new SpeechSynthesisUtterance(block.text)
    utterance.rate = wpmToSpeechRate(wpm)
    utterance.onend = advanceOnce
    utterance.onerror = advanceOnce

    const offsets = wordStartOffsets(block.text)
    utterance.onboundary = (event) => {
      if (event.name !== 'word') return
      let wordIndex = 0
      for (let i = 0; i < offsets.length; i++) {
        if (offsets[i] <= event.charIndex) wordIndex = i
        else break
      }
      setWordIndex(wordIndex)
    }

    utteranceRef.current = utterance
    pausedKeyRef.current = key

    // Chrome/WebKit can silently stall for seconds when speak() fires in the
    // same tick as cancel() (stuck-queue bug) — deferring one tick avoids it.
    speakTimeoutRef.current = window.setTimeout(() => {
      window.speechSynthesis.speak(utterance)
    }, 50)

    safetyTimeoutRef.current = window.setTimeout(
      advanceOnce,
      wordsToDurationMs(block.wordCount, wpm) * SAFETY_NET_MULTIPLIER,
    )
  }, [isReading, isSpeechEnabled, book, position.chapterIndex, position.blockIndex, wpm, nextBlock, setWordIndex])

  // Unmount only — stop any speech so it doesn't keep talking after the app goes away.
  useEffect(() => {
    return () => window.speechSynthesis?.cancel()
  }, [])
}
