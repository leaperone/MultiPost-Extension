/**
 * Common utility functions for platform scripts
 * These scripts will be injected into WebContentsView pages
 */

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (element) {
        resolve(element)
        observer.disconnect()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`))
    }, timeout)
  })
}

/**
 * Wait for multiple elements to appear
 */
export function waitForElements(selector: string, count: number, timeout = 30000): Promise<Element[]> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const checkElements = (): void => {
      const elements = document.querySelectorAll(selector)
      if (elements.length >= count) {
        resolve(Array.from(elements))
        return
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Failed to find ${count} "${selector}" elements within ${timeout}ms`))
        return
      }

      setTimeout(checkElements, 100)
    }

    checkElements()
  })
}

/**
 * Upload files to a file input element
 */
export async function uploadFiles(
  fileInput: HTMLInputElement,
  files: Array<{ url: string; name: string; type: string }>
): Promise<void> {
  const dataTransfer = new DataTransfer()

  for (const fileInfo of files) {
    try {
      const response = await fetch(fileInfo.url)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      const blob = await response.blob()
      const file = new File([blob], fileInfo.name, { type: fileInfo.type })
      dataTransfer.items.add(file)
    } catch (error) {
      console.error(`Failed to upload file ${fileInfo.url}:`, error)
    }
  }

  if (dataTransfer.files.length > 0) {
    fileInput.files = dataTransfer.files
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    // Wait for file processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

/**
 * Set text content using paste event (more reliable for rich editors)
 */
export function setTextByPaste(element: HTMLElement, text: string): void {
  element.focus()
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer()
  })
  pasteEvent.clipboardData!.setData('text/plain', text)
  element.dispatchEvent(pasteEvent)
}

/**
 * Set text content using input event
 */
export function setTextByInput(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  element.focus()
  element.value = text
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Click element and wait
 */
export async function clickAndWait(element: HTMLElement, waitMs = 1000): Promise<void> {
  element.click()
  await new Promise((resolve) => setTimeout(resolve, waitMs))
}

/**
 * Find button by text content
 */
export function findButtonByText(texts: string[]): HTMLElement | null {
  const buttons = document.querySelectorAll('button, a, span[role="button"]')
  for (const button of buttons) {
    const text = button.textContent?.trim() || ''
    if (texts.some((t) => text.includes(t))) {
      return button as HTMLElement
    }
  }
  return null
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
