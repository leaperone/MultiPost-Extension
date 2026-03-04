import type { RenderOptions, RenderResult } from './render'

interface WorkerResponse {
  id: string
  result?: string
  error?: string
}

let worker: Worker | null = null
let workerPromise: Promise<Worker> | null = null
let workerFailed = false
const pendingRequests = new Map<string, { resolve: (value: string) => void; reject: (reason: Error) => void }>()

function getWorker(): Promise<Worker> {
  if (workerFailed) {
    return Promise.reject(new Error('Worker previously failed'))
  }

  return workerPromise ??= new Promise((resolve, reject) => {
    try {
      const w = new Worker(new URL('./worker.ts', import.meta.url))

      w.onerror = (e) => {
        console.warn('Markdown Worker error, falling back to main thread:', e)
        workerFailed = true
        workerPromise = null
        // Reject all pending requests
        for (const [id, pending] of pendingRequests) {
          pending.reject(new Error('Worker error'))
          pendingRequests.delete(id)
        }
        reject(new Error('Worker failed to load'))
      }

      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, result, error } = e.data
        const pending = pendingRequests.get(id)
        if (pending) {
          pendingRequests.delete(id)
          if (error) {
            pending.reject(new Error(error))
          }
          else {
            pending.resolve(result ?? '')
          }
        }
      }

      worker = w
      resolve(w)
    }
    catch (err) {
      console.warn('Failed to create Worker, falling back to main thread:', err)
      workerFailed = true
      workerPromise = null
      reject(err)
    }
  })
}

let idCounter = 0
const WORKER_TIMEOUT = 15000

function callWorker(method: string, params: RenderOptions): Promise<string> {
  const id = `${method}-${++idCounter}`
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new Error('Worker render timeout'))
    }, WORKER_TIMEOUT)

    pendingRequests.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (reason) => {
        clearTimeout(timer)
        reject(reason)
      },
    })

    getWorker().then(w => {
      w.postMessage({ id, method, params })
    }).catch((err) => {
      clearTimeout(timer)
      pendingRequests.delete(id)
      reject(err)
    })
  })
}

async function renderDirect(options: RenderOptions): Promise<string> {
  const { render } = await import('./render')
  const { result } = await render(options)
  return result
}

export async function renderMarkdown(options: RenderOptions): Promise<RenderResult> {
  try {
    const result = await callWorker('render', options)
    return { result }
  }
  catch {
    // Fallback to main thread rendering
    const result = await renderDirect(options)
    return { result }
  }
}

export function prepareWorker(): Promise<void> {
  return getWorker().then(() => {}).catch(() => {
    // Worker failed, will use main thread rendering
  })
}
