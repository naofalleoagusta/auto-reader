import { useReaderState } from '../state/useReaderState'
import type { ThemeMode } from '../types/reader'

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'LIGHT' },
  { value: 'sepia', label: 'SEPIA' },
  { value: 'deep-dark', label: 'DARK' },
]

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60'

export function CommandPalette() {
  const isOpen = useReaderState((s) => s.isCommandPaletteOpen)
  const theme = useReaderState((s) => s.theme)
  const font = useReaderState((s) => s.font)
  const readingSpeedWpm = useReaderState((s) => s.readingSpeedWpm)
  const setCommandPaletteOpen = useReaderState((s) => s.setCommandPaletteOpen)
  const setTheme = useReaderState((s) => s.setTheme)
  const setFontFamily = useReaderState((s) => s.setFontFamily)
  const setFontSize = useReaderState((s) => s.setFontSize)
  const setLineHeight = useReaderState((s) => s.setLineHeight)
  const setSpeed = useReaderState((s) => s.setSpeed)

  if (!isOpen) return null

  const onClose = () => setCommandPaletteOpen(false)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-md border border-line bg-surface p-5 font-mono shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
          <span className="text-[11px] tracking-[0.2em] text-muted">PREFERENCES</span>
          <kbd className="border border-line px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>

        <section className="mb-5">
          <p className="mb-2 text-[11px] tracking-wider text-muted">THEME</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`border px-2 py-2 text-[11px] tracking-wider transition-colors ${FOCUS_RING} ${
                  theme === value
                    ? 'border-accent text-accent'
                    : 'border-line text-muted hover:border-accent/50 hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <p className="mb-2 text-[11px] tracking-wider text-muted">READING FONT</p>
          <div className="grid grid-cols-2 gap-2">
            {(['serif', 'sans'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFontFamily(option)}
                className={`border px-2 py-2 text-[11px] tracking-wider uppercase transition-colors ${FOCUS_RING} ${
                  font.fontFamily === option
                    ? 'border-accent text-accent'
                    : 'border-line text-muted hover:border-accent/50 hover:text-ink'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[11px] tracking-wider text-muted">
            FONT SIZE — {font.fontSize}PX
            <input
              type="range"
              min={14}
              max={28}
              value={font.fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className={`accent-[var(--color-accent)] ${FOCUS_RING}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] tracking-wider text-muted">
            LINE HEIGHT — {font.lineHeight.toFixed(1)}
            <input
              type="range"
              min={1.3}
              max={2}
              step={0.1}
              value={font.lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className={`accent-[var(--color-accent)] ${FOCUS_RING}`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] tracking-wider text-muted">
            READING SPEED — {readingSpeedWpm} WPM
            <input
              type="range"
              min={80}
              max={600}
              step={10}
              value={readingSpeedWpm}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className={`accent-[var(--color-accent)] ${FOCUS_RING}`}
            />
          </label>
        </section>
      </div>
    </div>
  )
}
