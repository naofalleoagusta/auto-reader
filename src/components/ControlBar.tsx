import { memo } from 'react'
import { MAX_WPM, MIN_WPM } from '../types/reader'

interface ControlBarProps {
  isReading: boolean
  onTogglePlay: () => void
  readingSpeedWpm: number
  onSpeedChange: (wpm: number) => void
  onSkipPrev: () => void
  onSkipNext: () => void
  onOpenCommandPalette: () => void
  onOpenSearch: () => void
  onToggleSidebar: () => void
  isSpeechEnabled: boolean
  onToggleSpeech: () => void
  chapterProgress: { chapterIndex: number; totalChapters: number }
  blockProgress: { blockIndex: number; totalBlocks: number }
}

const TEMPO_TICKS = 24
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60'

export const ControlBar = memo(function ControlBar({
  isReading,
  onTogglePlay,
  readingSpeedWpm,
  onSpeedChange,
  onSkipPrev,
  onSkipNext,
  onOpenCommandPalette,
  onOpenSearch,
  onToggleSidebar,
  isSpeechEnabled,
  onToggleSpeech,
  chapterProgress,
  blockProgress,
}: ControlBarProps) {
  const blockPercent =
    blockProgress.totalBlocks > 0 ? ((blockProgress.blockIndex + 1) / blockProgress.totalBlocks) * 100 : 0
  const speedPercent = ((readingSpeedWpm - MIN_WPM) / (MAX_WPM - MIN_WPM)) * 100

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-surface px-3 py-3 font-mono sm:px-6">
      <div className="relative h-px w-full bg-line">
        <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${blockPercent}%` }} />
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-ink sm:h-8 sm:w-8 ${FOCUS_RING}`}
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          className={`flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-ink sm:h-8 sm:w-8 ${FOCUS_RING}`}
          aria-label="Search books and text"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSkipPrev}
            aria-label="Previous paragraph"
            className={`flex h-11 w-11 items-center justify-center border border-transparent text-sm text-muted transition-colors hover:border-line hover:text-ink sm:h-8 sm:w-8 ${FOCUS_RING}`}
          >
            ‹‹
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isReading ? 'Pause' : 'Play'}
            className={`flex h-11 w-12 items-center justify-center border border-accent text-sm text-accent transition-colors hover:bg-accent hover:text-canvas sm:h-8 sm:w-12 ${FOCUS_RING}`}
          >
            {isReading ? '❚❚' : '▶'}
          </button>

          <button
            type="button"
            onClick={onSkipNext}
            aria-label="Next paragraph"
            className={`flex h-11 w-11 items-center justify-center border border-transparent text-sm text-muted transition-colors hover:border-line hover:text-ink sm:h-8 sm:w-8 ${FOCUS_RING}`}
          >
            ››
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-4">
          <button
            type="button"
            onClick={onToggleSpeech}
            aria-label={isSpeechEnabled ? 'Mute narration' : 'Unmute narration'}
            aria-pressed={isSpeechEnabled}
            className={`flex h-11 w-11 items-center justify-center transition-colors sm:h-8 sm:w-8 ${FOCUS_RING} ${isSpeechEnabled ? 'text-accent' : 'text-muted hover:text-ink'}`}
          >
            {isSpeechEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a9 9 0 0 1 0 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 9.5 21 14.5M21 9.5l-5 5" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`flex h-11 items-center gap-1.5 border border-line px-2 text-[11px] tabular-nums text-muted transition-colors hover:border-accent hover:text-accent sm:hidden ${FOCUS_RING}`}
            aria-label="Open reading speed preferences"
          >
            {readingSpeedWpm} WPM
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => onSpeedChange(readingSpeedWpm - 10)}
              className={`text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
              aria-label="Decrease speed"
            >
              −
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="text-sm tabular-nums text-ink">{readingSpeedWpm}</span>
              <div className="relative h-2 w-28">
                <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
                  {Array.from({ length: TEMPO_TICKS }).map((_, i) => (
                    <span key={i} className="h-1.5 w-px bg-line" />
                  ))}
                </div>
                <div
                  className="absolute top-1/2 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-accent"
                  style={{ left: `${speedPercent}%` }}
                />
              </div>
              <span className="text-[9px] tracking-[0.2em] text-muted">WPM</span>
            </div>

            <button
              type="button"
              onClick={() => onSpeedChange(readingSpeedWpm + 10)}
              className={`text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
              aria-label="Increase speed"
            >
              +
            </button>
          </div>

          <span className="hidden text-[11px] tabular-nums text-muted md:inline">
            {String(chapterProgress.chapterIndex + 1).padStart(2, '0')}/
            {String(chapterProgress.totalChapters).padStart(2, '0')}
          </span>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`hidden items-center border border-line px-2 py-1 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent sm:flex ${FOCUS_RING}`}
          >
            ⌘K
          </button>
        </div>
      </div>
    </div>
  )
})
