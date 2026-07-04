import { useCallback, useRef, useState } from 'react'
import type { ParseProgress } from '../types/parser'

interface DropZoneProps {
  onFileAccepted: (file: File) => void
  accept: string[]
  isLoading: boolean
  progress: ParseProgress | null
  error: string | null
  className?: string
}

export function DropZone({ onFileAccepted, accept, isLoading, progress, error, className }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptsFile = useCallback(
    (file: File) => accept.some((ext) => file.name.toLowerCase().endsWith(ext)),
    [accept],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file && acceptsFile(file)) onFileAccepted(file)
    },
    [acceptsFile, onFileAccepted],
  )

  const percent = progress ? Math.round((progress.loadedBytes / progress.totalBytes) * 100) : 0

  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 border p-8 text-center transition-colors duration-200 sm:p-14 ${
        isDragging ? 'border-accent bg-surface/60' : 'border-line'
      } ${className ?? ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {isLoading ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 font-mono">
          <p className="text-[11px] tracking-wider text-muted">
            {progress?.stage === 'parsing' ? 'PARSING…' : 'READING…'}
          </p>
          <div className="relative h-px w-full bg-line">
            <div className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-200 ease-out" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : (
        <>
          <p className="font-serif text-2xl italic text-ink">Bring a book.</p>
          <p className="font-mono text-[11px] tracking-wider text-muted">
            DROP AN EPUB OR PDF, OR BROWSE BELOW
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border border-line px-4 py-2 font-mono text-[11px] tracking-wider text-ink transition-colors hover:border-accent hover:text-accent"
          >
            BROWSE FILES
          </button>
        </>
      )}

      {error && <p className="font-mono text-[11px] tracking-wider text-red-400">ERROR: {error.toUpperCase()}</p>}
    </div>
  )
}
