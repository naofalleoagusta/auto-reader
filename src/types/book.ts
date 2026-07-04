export type BookSourceFormat = 'epub' | 'pdf'

export type TextBlockKind = 'paragraph' | 'heading' | 'quote'

export interface TextBlock {
  id: string
  chapterId: string
  /** Position within the chapter, 0-based. */
  index: number
  text: string
  /** Precomputed at parse time — drives WPM-based advance timing. */
  wordCount: number
  kind: TextBlockKind
}

export interface Chapter {
  id: string
  bookId: string
  /** Position within the book, 0-based. */
  index: number
  title: string
  blocks: TextBlock[]
  /** Sum of block.wordCount, cached to avoid re-derivation. */
  wordCount: number
}

export interface BookMetadata {
  id: string
  title: string
  author?: string
  /** Object URL created from the source File; revoke on book close/unload. */
  coverUrl?: string
  format: BookSourceFormat
  fileName: string
  sizeBytes: number
  /** Epoch ms, for recent-books ordering. */
  addedAt: number
}

export interface Book extends BookMetadata {
  chapters: Chapter[]
  totalWordCount: number
}
