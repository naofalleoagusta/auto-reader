import { useEffect } from 'react'
import { useReaderState } from '../state/useReaderState'

/**
 * Best-effort mobile background-playback aid: Media Session gives lock-screen
 * / notification transport controls, and on Chrome/Android in particular
 * improves the odds the browser keeps treating the tab as active media when
 * backgrounded. It does NOT reliably keep narration going on iOS Safari,
 * which suspends the Web Speech API aggressively when backgrounded/locked —
 * a platform limitation, not something fixable from this hook.
 */
export function useMediaSession(): void {
  const book = useReaderState((s) => s.book)
  const position = useReaderState((s) => s.position)
  const isReading = useReaderState((s) => s.isReading)
  const play = useReaderState((s) => s.play)
  const pause = useReaderState((s) => s.pause)
  const prevBlock = useReaderState((s) => s.prevBlock)
  const nextBlock = useReaderState((s) => s.nextBlock)

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!book) {
      navigator.mediaSession.metadata = null
      return
    }
    const chapter = book.chapters[position.chapterIndex]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapter?.title ?? book.title,
      artist: book.author ?? '',
      album: book.title,
    })
  }, [book, position.chapterIndex])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isReading ? 'playing' : 'paused'
  }, [isReading])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => play())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => prevBlock())
    navigator.mediaSession.setActionHandler('nexttrack', () => nextBlock())
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
  }, [play, pause, prevBlock, nextBlock])
}
