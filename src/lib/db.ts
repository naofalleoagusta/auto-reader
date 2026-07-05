import type { Book, LibraryEntry } from '../types/book'
import type { ReadingPosition } from '../types/reader'

const DB_NAME = 'auto-reader'
const DB_VERSION = 1
const BOOKS_STORE = 'books'
const LIBRARY_STORE = 'library'

// Cached across calls — opening a fresh IndexedDB connection per operation
// (this fires on every block advance plus throttled word-index writes during
// playback) adds needless per-call overhead. Reset on failure so a transient
// error doesn't permanently wedge every future call behind a rejected promise.
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(BOOKS_STORE)) db.createObjectStore(BOOKS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(LIBRARY_STORE)) db.createObjectStore(LIBRARY_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = fn(tx.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Saves the full book and creates/refreshes its library entry at block 0. */
export async function saveBook(book: Book): Promise<void> {
  await withStore<IDBValidKey>(BOOKS_STORE, 'readwrite', (store) => store.put(book))
  const entry: LibraryEntry = {
    id: book.id,
    title: book.title,
    author: book.author,
    format: book.format,
    fileName: book.fileName,
    sizeBytes: book.sizeBytes,
    addedAt: book.addedAt,
    lastPosition: { chapterIndex: 0, blockIndex: 0 },
    lastWordIndex: 0,
    lastOpenedAt: Date.now(),
  }
  await withStore<IDBValidKey>(LIBRARY_STORE, 'readwrite', (store) => store.put(entry))
}

/** Lightweight list for the sidebar — no chapter/block text loaded. */
export async function getLibrary(): Promise<LibraryEntry[]> {
  const entries = await withStore<LibraryEntry[]>(LIBRARY_STORE, 'readonly', (store) => store.getAll())
  return entries.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
}

export async function getLibraryEntry(id: string): Promise<LibraryEntry | null> {
  const entry = await withStore<LibraryEntry | undefined>(LIBRARY_STORE, 'readonly', (store) => store.get(id))
  return entry ?? null
}

/** Heuristic dedup for re-uploads — filename + size, not a content hash. */
export async function findLibraryEntryByFile(fileName: string, sizeBytes: number): Promise<LibraryEntry | null> {
  const library = await getLibrary()
  return library.find((entry) => entry.fileName === fileName && entry.sizeBytes === sizeBytes) ?? null
}

export async function getBook(id: string): Promise<Book | null> {
  const book = await withStore<Book | undefined>(BOOKS_STORE, 'readonly', (store) => store.get(id))
  return book ?? null
}

/** Single readwrite transaction for the get-then-put, instead of a separate
 * read transaction (getLibraryEntry) followed by a separate write one — this
 * fires often (every block advance, throttled word-index writes) so halving
 * the transaction count per call is a real, not just cosmetic, saving. */
export async function updateLastPosition(id: string, position: ReadingPosition, wordIndex = 0): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readwrite')
    const store = tx.objectStore(LIBRARY_STORE)
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const entry = getRequest.result as LibraryEntry | undefined
      if (!entry) {
        resolve()
        return
      }
      entry.lastPosition = position
      entry.lastWordIndex = wordIndex
      entry.lastOpenedAt = Date.now()
      const putRequest = store.put(entry)
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function deleteBook(id: string): Promise<void> {
  await withStore<undefined>(BOOKS_STORE, 'readwrite', (store) => store.delete(id))
  await withStore<undefined>(LIBRARY_STORE, 'readwrite', (store) => store.delete(id))
}

export async function clearLibrary(): Promise<void> {
  await withStore<undefined>(BOOKS_STORE, 'readwrite', (store) => store.clear())
  await withStore<undefined>(LIBRARY_STORE, 'readwrite', (store) => store.clear())
}
