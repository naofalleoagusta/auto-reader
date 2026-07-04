import { useEffect, useRef } from 'react'
import type { Book } from '../types/book'
import type { FontSettings, ReadingPosition } from '../types/reader'
import { splitWords } from '../lib/wpm'

interface ReaderCanvasProps {
  book: Book | null
  position: ReadingPosition
  currentWordIndex: number
  font: FontSettings
  isReading: boolean
  onBlockClick: (blockIndex: number) => void
}

export function ReaderCanvas({
  book,
  position,
  currentWordIndex,
  font,
  isReading,
  onBlockClick,
}: ReaderCanvasProps) {
  const activeBlockRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeBlockRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    })
  }, [position.chapterIndex, position.blockIndex])

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
              <p
                key={block.id}
                ref={isActive ? activeBlockRef : undefined}
                onClick={() => onBlockClick(index)}
                className={`cursor-pointer border-l-2 py-0.5 pl-4 -ml-4 transition-colors duration-300 ${
                  isActive
                    ? isReading
                      ? 'border-accent bg-accent/[0.06] text-ink'
                      : 'border-muted text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                } ${block.kind === 'heading' ? 'font-serif text-lg text-ink' : ''} ${
                  block.kind === 'quote' ? 'pl-10 italic text-muted' : ''
                }`}
              >
                {isActive
                  ? splitWords(block.text).map((word, wordIndex, words) => (
                      <span key={wordIndex}>
                        <span
                          className={
                            wordIndex === currentWordIndex ? 'rounded-[2px] bg-accent/30 text-ink' : undefined
                          }
                        >
                          {word}
                        </span>
                        {wordIndex < words.length - 1 ? ' ' : ''}
                      </span>
                    ))
                  : block.text}
              </p>
            )
          })}
        </div>
      </article>
    </div>
  )
}
