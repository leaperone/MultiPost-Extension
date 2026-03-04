import type { RenderOptions } from './render'
import { INPUT_SIZE_ERROR, MAX_INPUT_SIZE } from './constants'

interface WorkerMessage {
  id: string
  method: string
  params: RenderOptions
}

interface WorkerResponse {
  id: string
  result?: string
  error?: string
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, method, params } = e.data

  try {
    if (method === 'render') {
      if (params.markdown.length > MAX_INPUT_SIZE) {
        self.postMessage({ id, error: INPUT_SIZE_ERROR } satisfies WorkerResponse)
        return
      }
      const { render } = await import('./render')
      const { result } = await render(params)
      self.postMessage({ id, result } satisfies WorkerResponse)
    }
    else {
      self.postMessage({ id, error: `Unknown method: ${method}` } satisfies WorkerResponse)
    }
  }
  catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : 'Unknown error',
    } satisfies WorkerResponse)
  }
}
