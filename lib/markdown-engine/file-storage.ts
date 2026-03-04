const DB_NAME = 'multipost-md'
const DB_VERSION = 1
const STORE_NAME = 'files'

let db: Promise<IDBDatabase> | null = null
let dbUnavailable = false
let dbUnavailableReason = ''

const memoryFallback = new Map<string, string>()

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB 仅在浏览器环境可用'))
  }

  if (dbUnavailable) {
    return Promise.reject(new Error(dbUnavailableReason))
  }

  if (!db) {
    db = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        dbUnavailable = true
        dbUnavailableReason = '浏览器存储不可用，内容仅保存在内存中，刷新页面会丢失'
        db = null
        reject(request.error)
      }
    })
  }
  return db
}

export function isStorageUnavailable(): boolean {
  return dbUnavailable
}

export function getStorageUnavailableReason(): string {
  return dbUnavailableReason
}

export async function getFileContent(id: string): Promise<string> {
  if (dbUnavailable) {
    return memoryFallback.get(id) ?? ''
  }

  try {
    const database = await getDB()
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result?.content ?? '')
      request.onerror = () => resolve(memoryFallback.get(id) ?? '')
    })
  }
  catch {
    return memoryFallback.get(id) ?? ''
  }
}

export async function saveFileContent(id: string, content: string): Promise<void> {
  memoryFallback.set(id, content)

  if (dbUnavailable) {
    return
  }

  try {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put({ id, content })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  catch {
    //
  }
}

export async function deleteFileContent(id: string): Promise<void> {
  memoryFallback.delete(id)

  if (dbUnavailable) {
    return
  }

  try {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  catch {
    //
  }
}
