import type { BookParser } from '../../types/parser'
import { epubParser } from './epubParser'
import { pdfParser } from './pdfParser'

const parsers: BookParser[] = [epubParser, pdfParser]

export function resolveParser(file: File): BookParser {
  const parser = parsers.find((p) => p.supports(file))
  if (!parser) throw new Error(`Unsupported file type: ${file.name}`)
  return parser
}
