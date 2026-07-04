import type { Book } from './book'

export interface ParseProgress {
  loadedBytes: number
  totalBytes: number
  stage: 'reading' | 'parsing' | 'done'
}

export interface BookParser {
  /** Cheap synchronous check, e.g. by file extension. */
  supports(file: File): boolean
  /** Parses the file (possibly async/chunked) into the canonical Book shape. */
  parse(file: File, onProgress?: (progress: ParseProgress) => void): Promise<Book>
}
