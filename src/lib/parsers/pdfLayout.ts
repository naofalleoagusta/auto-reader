import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

interface PdfLine {
  text: string
  y: number
}

/** Minimum non-blank lines on a page before gap-based paragraph splitting kicks
 * in — with only 1-2 lines (cover pages, mostly-blank pages) a "median gap"
 * isn't meaningful, so the page just stays one paragraph. */
const MIN_LINES_FOR_GAP_SPLIT = 3
/** A gap this many times the page's median line-gap is treated as a paragraph
 * break. Arbitrary but documented threshold, not an exact science. */
const PARAGRAPH_GAP_MULTIPLIER = 1.6

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item
}

/**
 * Reconstructs lines from pdf.js's flat TextContent.items using each item's
 * own hasEOL flag as the line-break signal — more reliable than manually
 * clustering glyph y-coordinates. PDFs frequently split words across items
 * without an embedded space (unlike EPUB's DOM text nodes), so a space is
 * inserted between fragments only when neither side already has whitespace.
 */
export function linesFromTextContentItems(items: Array<TextItem | TextMarkedContent>): PdfLine[] {
  const lines: PdfLine[] = []
  let buffer = ''
  let lineY: number | null = null

  const flush = () => {
    const text = buffer.replace(/\s+/g, ' ').trim()
    if (text) lines.push({ text, y: lineY ?? 0 })
    buffer = ''
    lineY = null
  }

  for (const item of items) {
    if (!isTextItem(item)) continue
    if (lineY === null) lineY = item.transform[5]

    const needsSpace = buffer.length > 0 && !/\s$/.test(buffer) && !/^\s/.test(item.str)
    buffer += needsSpace ? ` ${item.str}` : item.str

    if (item.hasEOL) flush()
  }
  flush()

  return lines
}

/**
 * Splits a page's lines into paragraphs on vertical gaps exceeding the
 * page's typical line-gap. (pdf.js never emits a TextItem for blank vertical
 * space, so "blank line" isn't a distinct signal here — a paragraph break
 * always shows up as a larger y-gap between the surrounding lines instead.)
 * If gaps are too uniform to detect a break, the whole page becomes one
 * paragraph — an honest fallback rather than a forced heuristic, since PDFs
 * have no guaranteed paragraph markup the way EPUB's HTML does.
 */
export function groupLinesIntoParagraphs(lines: PdfLine[]): string[] {
  if (lines.length === 0) return []

  const gaps: number[] = []
  for (let i = 1; i < lines.length; i++) {
    gaps.push(Math.abs(lines[i - 1].y - lines[i].y))
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b)
  const medianGap = sortedGaps.length > 0 ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0
  const useGapSplit = lines.length >= MIN_LINES_FOR_GAP_SPLIT && medianGap > 0

  const paragraphs: string[] = []
  let current: string[] = [lines[0].text]

  for (let i = 1; i < lines.length; i++) {
    const gap = Math.abs(lines[i - 1].y - lines[i].y)
    const isBreak = useGapSplit && gap > medianGap * PARAGRAPH_GAP_MULTIPLIER
    if (isBreak) {
      paragraphs.push(current.join(' '))
      current = [lines[i].text]
    } else {
      current.push(lines[i].text)
    }
  }
  paragraphs.push(current.join(' '))

  return paragraphs.filter((p) => p.length > 0)
}
