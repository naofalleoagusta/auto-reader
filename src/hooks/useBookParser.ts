import { useCallback, useState } from 'react'
import type { Book } from '../types/book'
import type { ParseProgress } from '../types/parser'
import { resolveParser } from '../lib/parsers'

interface UseBookParserResult {
  parseFile: (file: File) => Promise<Book>
  isParsing: boolean
  progress: ParseProgress | null
  error: string | null
}

/**
 * Returns the parsed Book to the caller rather than committing it to the
 * store itself — keeps this hook single-responsibility (parsing + loading
 * state) and lets the caller decide when to load it.
 */
export function useBookParser(): UseBookParserResult {
  const [isParsing, setIsParsing] = useState(false)
  const [progress, setProgress] = useState<ParseProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(async (file: File): Promise<Book> => {
    setIsParsing(true)
    setProgress(null)
    setError(null)
    try {
      const parser = resolveParser(file)
      const book = await parser.parse(file, setProgress)
      return book
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file'
      setError(message)
      throw err
    } finally {
      setIsParsing(false)
    }
  }, [])

  return { parseFile, isParsing, progress, error }
}
