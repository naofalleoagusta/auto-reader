import { useEffect } from 'react'
import { useReaderState } from '../state/useReaderState'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}

/**
 * Global keyboard shortcuts, mounted once at the app root:
 *   Space              toggle play/pause
 *   ArrowUp/ArrowDown  adjust reading speed
 *   Shift+ArrowUp/Down skip to previous/next paragraph
 *   Escape             close search, else command palette, else toggle sidebar
 *   Ctrl/Cmd+K         toggle command palette
 *   Ctrl/Cmd+F         toggle search (books + in-book text), overrides native find
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const store = useReaderState.getState()

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        store.toggleCommandPalette()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        store.toggleSearch()
        return
      }

      if (event.key === 'Escape') {
        if (store.isSearchOpen) {
          store.setSearchOpen(false)
        } else if (store.isCommandPaletteOpen) {
          store.setCommandPaletteOpen(false)
        } else {
          store.toggleSidebar()
        }
        return
      }

      if (isTypingTarget(event.target)) return

      switch (event.key) {
        case ' ':
          event.preventDefault()
          store.togglePlay()
          break
        case 'ArrowUp':
          event.preventDefault()
          if (event.shiftKey) {
            store.prevBlock()
          } else {
            store.adjustSpeed(10)
          }
          break
        case 'ArrowDown':
          event.preventDefault()
          if (event.shiftKey) {
            store.nextBlock()
          } else {
            store.adjustSpeed(-10)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
