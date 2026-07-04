# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm build` — typecheck (`tsc -b`) then production build via Vite
- `pnpm lint` — oxlint
- `pnpm preview` — preview a production build

No test suite exists in this repo.

Package manager is pnpm — a `pnpm-workspace.yaml` exists (not a real monorepo; it holds `packages: ['.']` plus `allowBuilds` for `core-js`/`es5-ext`/`esbuild` postinstall scripts). This file is load-bearing: pnpm 11 does **not** honor `pnpm.onlyBuiltDependencies` in `package.json` — the working mechanism is `allowBuilds` in `pnpm-workspace.yaml`. Don't delete this file or move that config back to `package.json` expecting it to work (confirmed empirically — see git history around "fix build workers").

Deploys to Cloudflare Workers via `wrangler.jsonc` (static assets from `./dist`, SPA fallback via `not_found_handling: "single-page-application"`, routed at `auto-reader.naofalleoagusta.com/*`). To validate wrangler config changes without a real deploy: `npx wrangler deploy --dry-run`.

## Architecture

Local-first EPUB/PDF reader: Vite + React 19 + TypeScript + Tailwind v4 (CSS-native `@theme`, no `tailwind.config.js`) + zustand. No backend — everything happens client-side from a `File` the user drops or picks.

**State**: `src/state/useReaderState.ts` is a single zustand store holding the loaded `Book`, reading `position` (chapter/block index), playback state (`isReading`, `readingSpeedWpm`, `isSpeechEnabled`), font/theme settings, and UI toggles (sidebar, command palette). All components read via selectors; only `App.tsx` wires the behavior hooks together and passes props down — components never touch the store directly.

**Parser seam** (`src/lib/parsers/`): `resolveParser(file)` in `index.ts` dispatches to `epubParser.ts` or `pdfParser.ts` by extension. Both implement the `BookParser` interface (`src/types/parser.ts`: `supports()` + `parse(file, onProgress?)`) and produce the same canonical `Book → Chapter → TextBlock` shape (`src/types/book.ts`). This interface is the reason swapping parsing strategy never touches `useBookParser.ts` or any component.
- `epubParser.ts` uses `epubjs` directly — walks `book.spine.spineItems` (not `book.loaded.spine`, which resolves to the wrong shape despite what epubjs's own `.d.ts` implies), extracts headings/paragraphs/blockquotes from each section's DOM, maps chapter titles from `book.navigation.toc`. epubjs's shipped types are unreliable in a few places (`Section.load()` is typed as sync-returning-`Document` but is actually async; `Spine.spineItems` isn't in the `.d.ts` at all) — the code works around this with narrow local type shapes rather than trusting the package's `.d.ts`.
- `pdfParser.ts` uses `pdfjs-dist`. The worker is wired via Vite's `?url` import (`import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` → `GlobalWorkerOptions.workerSrc = workerSrc`) — no `vite.config.ts` changes needed for this. Chapters come from the PDF's outline/bookmarks when present and resolvable (top-level entries only, mapped to page ranges via `getDestination`/`getPageIndex`), falling back to one whole-document chapter when there's no usable outline. Paragraph boundaries are inferred from `pdf.js`'s per-line `hasEOL` signal plus a line-gap heuristic (`pdfLayout.ts`) — PDFs have no real semantic structure, so all PDF-derived blocks are `kind: 'paragraph'` (no heading/quote detection).
- Both parsers throw rather than silently return an empty book when there's no extractable text (e.g. scanned/image-only PDFs) — preserve that behavior in any new parser.

**Auto-advance vs. narration pacing** (this is the trickiest part of the runtime behavior, read before touching either hook): `useAutoAdvance.ts` paces silent reading via `requestAnimationFrame` using a word-count/WPM estimate (`wordsToDurationMs` in `lib/wpm.ts`). `useTextToSpeech.ts` is the pacing driver instead whenever narration is on — it advances on the browser's actual `utterance.onend`/`onerror`, not the word-count estimate, because real speech duration doesn't match a word-count guess closely enough (long paragraphs would leave dead silence, short ones would get cut off). `useAutoAdvance` explicitly no-ops when `isSpeechEnabled` is true so the two never both drive `nextBlock()`. `useTextToSpeech` also has a safety-net timeout (word-count estimate × 4) in case `onend` never fires (e.g. no voices installed on the platform), and defers `speak()` by one tick after `cancel()` — calling them in the same tick is a real Chrome/WebKit bug that stalls the speech queue for seconds.

**Theming**: CSS custom properties keyed off `data-theme` on `<html>` (`light`/`sepia`/`deep-dark`, applied by `useApplyTheme.ts`), defined in `src/index.css`. Two font families only, each with one job: `Spectral` (serif) for book content and titles, `IBM Plex Mono` for all UI chrome/labels/data. The `sans` reading-font option is the system UI stack, not a third custom font — deliberate, not an oversight.

**Keyboard shortcuts** (`useKeyboardShortcuts.ts`, all global via a single `window.keydown` listener): `Space` play/pause, `ArrowUp`/`ArrowDown` adjust WPM, `Shift+ArrowUp`/`Shift+ArrowDown` skip paragraph, `Esc` close command palette or toggle sidebar, `Cmd/Ctrl+K` toggle command palette. All except `Esc`/`Cmd+K` are ignored while focus is in an input/textarea/contentEditable.

**Mobile note**: sidebar is a full-overlay drawer below the `lg` breakpoint (defaults closed there via a `matchMedia` check on mount in `App.tsx`) and a static docked pane at `lg`+. `ControlBar` swaps the desktop tempo-ruler + `⌘K` button for a single compact `"{wpm} WPM"` button below `sm` that opens the same command palette — don't reintroduce desktop-only controls without a mobile equivalent or an explicit decision to omit one.
