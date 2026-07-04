import { memo } from 'react'
import type { FontFamilyOption, FontSettings, ThemeMode } from '../types/reader'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  font: FontSettings
  onFontFamilyChange: (family: FontFamilyOption) => void
  onFontSizeChange: (size: number) => void
  onLineHeightChange: (lineHeight: number) => void
  readingSpeedWpm: number
  onSpeedChange: (wpm: number) => void
}

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'LIGHT' },
  { value: 'sepia', label: 'SEPIA' },
  { value: 'deep-dark', label: 'DARK' },
]

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60'

export const CommandPalette = memo(function CommandPalette({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  font,
  onFontFamilyChange,
  onFontSizeChange,
  onLineHeightChange,
  readingSpeedWpm,
  onSpeedChange,
}: CommandPaletteProps) {
  if (!isOpen) return null

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
                onClick={() => onThemeChange(value)}
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
                onClick={() => onFontFamilyChange(option)}
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
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
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
              onChange={(e) => onLineHeightChange(Number(e.target.value))}
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
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className={`accent-[var(--color-accent)] ${FOCUS_RING}`}
            />
          </label>
        </section>
      </div>
    </div>
  )
})
