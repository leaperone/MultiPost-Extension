import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  PlatformType,
  SyncContentType,
  SyncContentData
} from '../../shared/types'

/**
 * Base platform adapter interface
 * All platform adapters must implement this interface
 */
export interface PlatformAdapter {
  readonly platform: PlatformType
  readonly name: string
  readonly publishUrl: string
  readonly supportedContentTypes: SyncContentType[]

  /**
   * Get JavaScript code that fills content into the publish form
   * Used for simple mode without needing a WebContentsView reference
   */
  getFillScript(contentType: SyncContentType, data: SyncContentData): string

  /**
   * Check if user is logged in
   */
  checkLoginStatus(view: WebContentsView): Promise<boolean>

  /**
   * Get user info after login
   */
  getUserInfo(view: WebContentsView): Promise<{
    username: string
    displayName?: string
    avatar?: string
  } | null>

  /**
   * Navigate to the publishing page
   */
  navigateToPublishPage(view: WebContentsView, contentType?: SyncContentType): Promise<void>

  /**
   * Fill content into the publish form
   */
  fillContent(
    view: WebContentsView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void>

  /**
   * Upload images
   */
  uploadImages?(view: WebContentsView, imagePaths: string[]): Promise<void>

  /**
   * Upload video
   */
  uploadVideo?(view: WebContentsView, videoPath: string): Promise<void>

  /**
   * Submit the post
   */
  submit(view: WebContentsView, contentType?: SyncContentType): Promise<PublishResult>

  /**
   * Full publish flow
   */
  publish(
    view: WebContentsView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<PublishResult>
}

/**
 * Base implementation with common functionality
 */
export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly platform: PlatformType
  abstract readonly name: string
  abstract readonly publishUrl: string
  abstract readonly supportedContentTypes: SyncContentType[]

  /**
   * Get JavaScript code that fills content into the publish form
   * Subclasses should override this for platform-specific behavior
   */
  abstract getFillScript(contentType: SyncContentType, data: SyncContentData): string

  abstract checkLoginStatus(view: WebContentsView): Promise<boolean>

  abstract getUserInfo(view: WebContentsView): Promise<{
    username: string
    displayName?: string
    avatar?: string
  } | null>

  abstract navigateToPublishPage(view: WebContentsView, contentType?: SyncContentType): Promise<void>

  abstract fillContent(
    view: WebContentsView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void>

  abstract submit(view: WebContentsView, contentType?: SyncContentType): Promise<PublishResult>

  // Optional methods that subclasses can implement
  uploadImages?(view: WebContentsView, imagePaths: string[]): Promise<void>
  uploadVideo?(view: WebContentsView, videoPath: string): Promise<void>

  /**
   * Execute JavaScript in the WebContentsView with error handling
   */
  protected async executeScript<T = unknown>(
    view: WebContentsView,
    script: string
  ): Promise<T> {
    try {
      return await view.webContents.executeJavaScript(script)
    } catch (error) {
      console.error(`Script execution failed in ${this.name}:`, error)
      throw error
    }
  }

  /**
   * Wait for an element to appear
   */
  protected async waitForElement(
    view: WebContentsView,
    selector: string,
    timeout = 10000
  ): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const exists = await this.executeScript<boolean>(
        view,
        `!!document.querySelector('${selector}')`
      )
      if (exists) return true
      await this.sleep(500)
    }

    return false
  }

  /**
   * Wait for navigation to complete
   */
  protected async waitForNavigation(view: WebContentsView, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        view.webContents.removeListener('did-finish-load', handler)
        reject(new Error('Navigation timeout'))
      }, timeout)

      const handler = (): void => {
        clearTimeout(timer)
        resolve()
      }

      view.webContents.once('did-finish-load', handler)
    })
  }

  /**
   * Add random delay to simulate human behavior
   */
  protected async randomDelay(min = 500, max = 1500): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await this.sleep(delay)
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Default publish implementation
   */
  async publish(
    view: WebContentsView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<PublishResult> {
    try {
      // Check login status first
      const isLoggedIn = await this.checkLoginStatus(view)
      if (!isLoggedIn) {
        return {
          success: false,
          error: '未登录，请先登录账号'
        }
      }

      // Navigate to publish page
      await this.navigateToPublishPage(view, contentType)
      await this.randomDelay()

      // Fill content
      await this.fillContent(view, contentType, data)
      await this.randomDelay()

      // Submit
      return await this.submit(view, contentType)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '发布失败'
      }
    }
  }
}
