import { useEffect } from 'react'
import { useReaderState } from '../state/useReaderState'

export function useApplyTheme(): void {
  const theme = useReaderState((s) => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
}
