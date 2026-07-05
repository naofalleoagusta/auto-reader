import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy, RefProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'
import type { Book, Chapter, TextBlock } from '../../types/book'
import type { BookParser, ParseProgress } from '../../types/parser'
import { createId } from '../id'
import { countWords } from '../wpm'
import { groupLinesIntoParagraphs, linesFromTextContentItems } from './pdfLayout'

interface PdfInfoDict {
  Title?: string
  Author?: string
}

interface ChapterRange {
  title: string | null
  startPage: number
  endPage: number
}

type OutlineNode = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number]

async function resolveDestToPageIndex(
  pdfDocument: PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<number | null> {
  try {
    let resolved = dest
    if (typeof resolved === 'string') {
      resolved = await pdfDocument.getDestination(resolved)
    }
    if (!Array.isArray(resolved) || resolved.length === 0) return null

    const ref = resolved[0]
    if (typeof ref === 'number') return ref
    return await pdfDocument.getPageIndex(ref as RefProxy)
  } catch {
    return null
  }
}

/**
 * Top-level outline entries only — matches EPUB's chapter-level granularity
 * (spine items), not sub-heading granularity nested outline items would give.
 */
async function resolveChapterRanges(
  pdfDocument: PDFDocumentProxy,
  outline: OutlineNode[] | null,
): Promise<ChapterRange[]> {
  const numPages = pdfDocument.numPages
  const fallback: ChapterRange[] = [{ title: null, startPage: 1, endPage: numPages }]

  if (!outline || outline.length === 0) return fallback

  const resolvedPages = await Promise.all(
    outline.map((entry) => resolveDestToPageIndex(pdfDocument, entry.dest)),
  )

  const validPages = resolvedPages.filter((p): p is number => p !== null)
  const uniquePages = new Set(validPages)
  if (validPages.length === 0) return fallback
  if (uniquePages.size === 1) return fallback
  if (validPages.length < outline.length * 0.5) return fallback

  const pairs = outline
    .map((entry, i) => ({ title: entry.title.trim() || `Chapter ${i + 1}`, page: resolvedPages[i] }))
    .filter((p): p is { title: string; page: number } => p.page !== null)
    .sort((a, b) => a.page - b.page)

  const ranges: ChapterRange[] = pairs.map((pair, i) => ({
    title: pair.title,
    startPage: pair.page + 1,
    endPage: i + 1 < pairs.length ? pairs[i + 1].page : numPages - 1 + 1,
  }))

  if (ranges[0].startPage > 1) {
    ranges.unshift({ title: 'Front Matter', startPage: 1, endPage: ranges[0].startPage - 1 })
  }

  return ranges
}

function extractPageParagraphs(items: Array<TextItem | TextMarkedContent>): string[] {
  return groupLinesIntoParagraphs(linesFromTextContentItems(items))
}

export const pdfParser: BookParser = {
  supports: (file) => file.name.toLowerCase().endsWith('.pdf'),
  parse: async (file, onProgress) => {
    const totalBytes = file.size || 1
    const tick = (loadedBytes: number, stage: ParseProgress['stage']) =>
      onProgress?.({ loadedBytes, totalBytes, stage })

    tick(0, 'reading')
    const arrayBuffer = await file.arrayBuffer()

    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = workerSrc

    const loadingTask = getDocument({ data: arrayBuffer })
    loadingTask.onProgress = ({ loaded }: { loaded: number; total: number }) => {
      tick(Math.min(loaded, totalBytes), 'reading')
    }
    const pdfDocument = await loadingTask.promise
    tick(Math.round(totalBytes * 0.2), 'parsing')

    const [outline, metadataResult] = await Promise.all([
      pdfDocument.getOutline().catch(() => null),
      pdfDocument.getMetadata().catch(() => null),
    ])
    const info = (metadataResult?.info ?? {}) as PdfInfoDict
    const fallbackTitle = info.Title?.trim() || file.name.replace(/\.[^.]+$/, '')

    const ranges = await resolveChapterRanges(pdfDocument, outline)

    const bookId = createId('book')
    const chapters: Chapter[] = []
    let pagesProcessed = 0

    for (const range of ranges) {
      const chapterId = createId('chapter')
      const blocks: TextBlock[] = []

      for (let pageNum = range.startPage; pageNum <= range.endPage; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()
        const paragraphs = extractPageParagraphs(textContent.items)

        for (const text of paragraphs) {
          blocks.push({
            id: createId('block'),
            chapterId,
            index: blocks.length,
            text,
            wordCount: countWords(text),
            kind: 'paragraph',
          })
        }

        pagesProcessed += 1
        tick(Math.round(totalBytes * (0.2 + 0.7 * (pagesProcessed / pdfDocument.numPages))), 'parsing')
      }

      if (blocks.length === 0) continue

      const wordCount = blocks.reduce((sum, block) => sum + block.wordCount, 0)
      chapters.push({
        id: chapterId,
        bookId,
        index: chapters.length,
        title: range.title ?? fallbackTitle,
        blocks,
        wordCount,
      })
    }

    if (chapters.length === 0) {
      throw new Error('No readable text found in this PDF.')
    }

    tick(totalBytes, 'done')

    const totalWordCount = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)

    const book: Book = {
      id: bookId,
      title: fallbackTitle,
      author: info.Author?.trim() || undefined,
      format: 'pdf',
      fileName: file.name,
      sizeBytes: file.size,
      addedAt: Date.now(),
      chapters,
      totalWordCount,
    }
    return book
  },
}
