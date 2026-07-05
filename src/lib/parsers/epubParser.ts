import type { NavItem } from 'epubjs'
import type { Book, Chapter, TextBlock, TextBlockKind } from '../../types/book'
import type { BookParser, ParseProgress } from '../../types/parser'
import { createId } from '../id'
import { countWords } from '../wpm'

const BLOCK_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, blockquote, li'

/**
 * epubjs' shipped .d.ts declares Section.load() as returning a Document
 * synchronously and omits Spine.spineItems entirely — both wrong against the
 * actual runtime (load() is async; spineItems is the real per-chapter list).
 * This narrow local shape covers only what we use here.
 */
interface EpubSection {
  href: string
  document: Document | undefined
  load(request: (url: string) => Promise<unknown>): Promise<unknown>
  unload(): void
}

function blockKindForTag(tagName: string): TextBlockKind {
  // Sections are parsed as application/xhtml+xml (XML mode), so tagName
  // keeps source casing (often lowercase) instead of HTML's always-uppercase.
  const normalized = tagName.toUpperCase()
  if (/^H[1-6]$/.test(normalized)) return 'heading'
  if (normalized === 'BLOCKQUOTE') return 'quote'
  return 'paragraph'
}

function flattenToc(items: NavItem[], hrefToLabel: Map<string, string>) {
  for (const item of items) {
    const base = item.href.split('#')[0]
    if (!hrefToLabel.has(base)) hrefToLabel.set(base, item.label.trim())
    if (item.subitems?.length) flattenToc(item.subitems, hrefToLabel)
  }
}

function extractBlocks(doc: Document, chapterId: string): TextBlock[] {
  const blocks: TextBlock[] = []
  const nodes = doc.body?.querySelectorAll(BLOCK_SELECTOR) ?? []
  nodes.forEach((node) => {
    const text = node.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    if (!text) return
    blocks.push({
      id: createId('block'),
      chapterId,
      index: blocks.length,
      text,
      wordCount: countWords(text),
      kind: blockKindForTag(node.tagName),
    })
  })
  return blocks
}

export const epubParser: BookParser = {
  supports: (file) => file.name.toLowerCase().endsWith('.epub'),
  parse: async (file, onProgress) => {
    const totalBytes = file.size || 1
    const tick = (loadedBytes: number, stage: ParseProgress['stage']) =>
      onProgress?.({ loadedBytes, totalBytes, stage })

    tick(0, 'reading')
    const arrayBuffer = await file.arrayBuffer()
    tick(Math.round(totalBytes * 0.2), 'parsing')

    const { default: EpubJs } = await import('epubjs')
    const epubBook = EpubJs(arrayBuffer)
    await epubBook.ready

    const [metadata, navigation] = await Promise.all([
      epubBook.loaded.metadata,
      epubBook.loaded.navigation,
    ])

    const tocByHref = new Map<string, string>()
    flattenToc(navigation.toc, tocByHref)

    const spineItems = (epubBook.spine as unknown as { spineItems: EpubSection[] }).spineItems

    const bookId = createId('book')
    const chapters: Chapter[] = []

    for (let i = 0; i < spineItems.length; i++) {
      const section = spineItems[i]
      if (!section.href) continue

      await section.load(epubBook.load.bind(epubBook))
      const doc = section.document
      const chapterId = createId('chapter')
      const blocks = doc ? extractBlocks(doc, chapterId) : []
      section.unload()

      tick(Math.round(totalBytes * (0.2 + 0.7 * ((i + 1) / spineItems.length))), 'parsing')

      if (blocks.length === 0) continue

      const wordCount = blocks.reduce((sum, block) => sum + block.wordCount, 0)
      const title = tocByHref.get(section.href.split('#')[0]) ?? `Chapter ${chapters.length + 1}`

      chapters.push({
        id: chapterId,
        bookId,
        index: chapters.length,
        title,
        blocks,
        wordCount,
      })
    }

    if (chapters.length === 0) {
      throw new Error('No readable text found in this EPUB.')
    }

    tick(totalBytes, 'done')

    const totalWordCount = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)

    const book: Book = {
      id: bookId,
      title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
      author: metadata.creator || undefined,
      format: 'epub',
      fileName: file.name,
      sizeBytes: file.size,
      addedAt: Date.now(),
      chapters,
      totalWordCount,
    }
    return book
  },
}
