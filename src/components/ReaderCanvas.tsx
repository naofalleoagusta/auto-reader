import { memo, useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import { useReaderState } from '../state/useReaderState'
import type { TextBlock } from '../types/book'
import { splitWords } from '../lib/wpm'

interface BlockViewProps {
  block: TextBlock
  index: number
  isActive: boolean
  isReading: boolean
  /** Only meaningful when isActive — callers pass a stable -1 otherwise, so
   * the tick-driven word index never shows up as a changed prop for
   * non-active blocks and React.memo can skip them entirely. */
  currentWordIndex: number
  onBlockClick: (index: number) => void
  activeBlockRef: RefObject<HTMLParagraphElement | null>
  activeWordRef: RefObject<HTMLSpanElement | null>
}

const BlockView = memo(function BlockView({
  block,
  index,
  isActive,
  isReading,
  currentWordIndex,
  onBlockClick,
  activeBlockRef,
  activeWordRef,
}: BlockViewProps) {
  const words = useMemo(() => (isActive ? splitWords(block.text) : null), [isActive, block.text])

  return (
    <p
      ref={isActive ? activeBlockRef : undefined}
      role="button"
      tabIndex={0}
      // pointerdown, not click: while playing, our own word-follow auto-scroll
      // can shift the layout between press and release, so a click (fires on
      // release) can land on the next block down. Acting on initial contact
      // avoids that moving-target bug.
      onPointerDown={() => onBlockClick(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onBlockClick(index)
        }
      }}
      className={`cursor-pointer border-l-2 py-0.5 pl-4 -ml-4 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        isActive
          ? isReading
            ? 'border-accent bg-accent/[0.06] text-ink'
            : 'border-muted text-ink'
          : 'border-transparent text-muted hover:text-ink'
      } ${block.kind === 'heading' ? 'font-serif text-lg text-ink' : ''} ${
        block.kind === 'quote' ? 'pl-10 italic text-muted' : ''
      }`}
    >
      {words
        ? words.map((word, wordIndex, allWords) => {
            const isActiveWord = wordIndex === currentWordIndex
            return (
              <span key={wordIndex}>
                <span
                  ref={isActiveWord ? activeWordRef : undefined}
                  className={isActiveWord ? 'rounded-[2px] bg-accent/30 text-ink' : undefined}
                >
                  {word}
                </span>
                {wordIndex < allWords.length - 1 ? ' ' : ''}
              </span>
            )
          })
        : block.text}
    </p>
  )
})

export function ReaderCanvas() {
  const book = useReaderState((s) => s.book)
  const position = useReaderState((s) => s.position)
  const currentWordIndex = useReaderState((s) => s.currentWordIndex)
  const font = useReaderState((s) => s.font)
  const isReading = useReaderState((s) => s.isReading)
  const setPosition = useReaderState((s) => s.setPosition)

  // useCallback here isn't decorative — BlockView is memoized specifically so
  // non-active blocks skip re-rendering on every ~120ms word tick, and that
  // only holds if the click handler each block receives has a stable
  // identity across those ticks (it only changes when the chapter itself
  // changes, not on tick or blockIndex-within-chapter changes).
  const onBlockClick = useCallback(
    (blockIndex: number) => setPosition({ chapterIndex: position.chapterIndex, blockIndex }),
    [setPosition, position.chapterIndex],
  )

  const activeBlockRef = useRef<HTMLParagraphElement | null>(null)
  const activeWordRef = useRef<HTMLSpanElement | null>(null)
  const prevPositionRef = useRef({ chapterIndex: position.chapterIndex, blockIndex: position.blockIndex })

  // Word-follow is the default (fires on every word advance, 'nearest' so it
  // only nudges once the word nears the edge) — but on an actual paragraph
  // switch, center the whole new paragraph instead. Both firing on the same
  // render (word index also resets to 0 on switch) would race two competing
  // scrollIntoView calls, so this is one effect that picks one or the other.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = prefersReducedMotion ? 'auto' : 'smooth'

    const paragraphChanged =
      prevPositionRef.current.chapterIndex !== position.chapterIndex ||
      prevPositionRef.current.blockIndex !== position.blockIndex
    prevPositionRef.current = { chapterIndex: position.chapterIndex, blockIndex: position.blockIndex }

    if (paragraphChanged) {
      activeBlockRef.current?.scrollIntoView({ behavior, block: 'center' })
    } else {
      activeWordRef.current?.scrollIntoView({ behavior, block: 'nearest' })
    }
  }, [position.chapterIndex, position.blockIndex, currentWordIndex])

  if (!book) {
    return (
      <div className="flex h-full flex-1 items-center justify-center font-mono text-[13px] text-muted">
        Open a book to start reading.
      </div>
    )
  }

  const chapter = book.chapters[position.chapterIndex]

  return (
    <div className="flex-1 overflow-y-auto px-6 py-16 sm:px-12">
      <article className="mx-auto max-w-2xl">
        <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-muted">
          CHAPTER {String(chapter.index + 1).padStart(2, '0')}
        </p>
        <h1 className="mb-6 border-b border-line pb-6 font-serif text-3xl text-ink">{chapter.title}</h1>
        <div
          className="flex flex-col gap-5"
          style={{
            fontSize: `${font.fontSize}px`,
            lineHeight: font.lineHeight,
            fontFamily: font.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)',
          }}
        >
          {chapter.blocks.map((block, index) => {
            const isActive = index === position.blockIndex
            return (
              <BlockView
                key={block.id}
                block={block}
                index={index}
                isActive={isActive}
                isReading={isReading}
                currentWordIndex={isActive ? currentWordIndex : -1}
                onBlockClick={onBlockClick}
                activeBlockRef={activeBlockRef}
                activeWordRef={activeWordRef}
              />
            )
          })}
        </div>
      </article>
    </div>
  )
}
