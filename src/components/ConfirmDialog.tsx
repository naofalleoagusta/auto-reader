import { useEffect } from 'react'
import { useReaderState } from '../state/useReaderState'

export function ConfirmDialog() {
  const request = useReaderState((s) => s.confirmDialog)
  const cancelConfirmDialog = useReaderState((s) => s.cancelConfirmDialog)

  const isOpen = request !== null

  // Capture phase, so this wins over useKeyboardShortcuts' global Esc
  // handler (which would otherwise also toggle the sidebar/command palette
  // on the same keypress) while the dialog is open.
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cancelConfirmDialog()
      } else if (e.key === 'Enter') {
        e.stopPropagation()
        request?.onConfirm()
        cancelConfirmDialog()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [isOpen, request, cancelConfirmDialog])

  if (!request) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={cancelConfirmDialog}
    >
      <div
        className="w-full max-w-sm border border-line bg-surface p-5 font-mono shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <span className="text-[11px] tracking-[0.2em] text-muted">{request.title.toUpperCase()}</span>
          <kbd className="border border-line px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>

        <p className="font-serif text-base text-ink">{request.message}</p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelConfirmDialog}
            className="border border-line px-3 py-1.5 text-[11px] tracking-wider text-muted transition-colors hover:border-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              request.onConfirm()
              cancelConfirmDialog()
            }}
            className="border border-red-400/50 px-3 py-1.5 text-[11px] tracking-wider text-red-400 transition-colors hover:bg-red-400 hover:text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          >
            {request.confirmLabel.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  )
}
