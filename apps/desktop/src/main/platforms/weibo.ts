import type { BrowserView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  VideoData,
  ArticleData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Weibo platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO, ARTICLE
 */
export class WeiboAdapter extends BasePlatformAdapter {
  readonly platform = 'weibo' as const
  readonly name = '微博'
  readonly publishUrl = 'https://weibo.com'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC', 'VIDEO', 'ARTICLE']

  /**
   * Get JavaScript code to fill content into Weibo publish form
   */
  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
      case 'VIDEO':
        return this.getVideoFillScript(data as VideoData)
      case 'ARTICLE':
        return this.getArticleFillScript(data as ArticleData)
      default:
        return `console.log('Unsupported content type: ${contentType}')`
    }
  }

  /**
   * Dynamic content fill script
   */
  private getDynamicFillScript(data: DynamicData): string {
    const content = data.content || ''
    const title = data.title || ''
    const fullContent = title ? `${title}\n${content}` : content
    const images = data.images || []

    return `
      (async function() {
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) { resolve(element); return; }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) { resolve(element); observer.disconnect(); }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found: ' + selector));
            }, timeout);
          });
        }

        function waitForElements(selector, count, timeout = 30000) {
          return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkElements = () => {
              const elements = document.querySelectorAll(selector);
              if (elements.length >= count) {
                resolve(Array.from(elements));
                return;
              }
              if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for ' + count + ' elements: ' + selector));
                return;
              }
              setTimeout(checkElements, 100);
            };
            checkElements();
          });
        }

        function waitForUploadsToComplete(timeout = 60000) {
          return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkStatus = () => {
              const loadingElements = document.querySelectorAll('.Image_loading_1lfUB');
              if (loadingElements.length === 0) {
                console.log('所有图片上传已完成');
                resolve();
                return;
              }
              if (Date.now() - startTime > timeout) {
                reject(new Error('图片上传超时'));
                return;
              }
              setTimeout(checkStatus, 500);
            };
            setTimeout(checkStatus, 100);
          });
        }

        async function uploadFiles(images) {
          const fileInput = await waitForElement('input[type="file"]');
          if (!fileInput) {
            console.error('未找到文件输入元素');
            return;
          }

          const dataTransfer = new DataTransfer();

          for (const file of images) {
            try {
              const response = await fetch(file.url);
              if (!response.ok) throw new Error('HTTP error: ' + response.status);
              const blob = await response.blob();
              const imageFile = new File([blob], file.name, { type: file.type });
              console.log('文件: ' + imageFile.name + ' ' + imageFile.type + ' ' + imageFile.size);
              dataTransfer.items.add(imageFile);
            } catch (error) {
              console.error('上传文件失败:', file.url, error);
            }
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('文件上传操作完成');
          }
        }

        try {
          const images = ${JSON.stringify(images)};

          const inputElement = await waitForElement('textarea[placeholder="有什么新鲜事想分享给大家？"]');
          inputElement.value = ${JSON.stringify(fullContent)};
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('成功填入微博内容');

          // 处理图片上传
          if (images && images.length > 0) {
            await uploadFiles(images);
            await waitForElements('i[title="删除"]', images.length);
            await waitForUploadsToComplete();
          }

          console.log('成功填入微博内容和图片');
        } catch (error) {
          console.error('Failed to fill dynamic content:', error);
        }
      })()
    `
  }

  /**
   * Video content fill script
   */
  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const description = data.content || ''
    const fullContent = title ? `${title}\n${description}` : description

    return `
      (async function() {
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) { resolve(element); return; }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) { resolve(element); observer.disconnect(); }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found: ' + selector));
            }, timeout);
          });
        }

        try {
          // Try to fill video description
          const inputElement = await waitForElement('textarea[placeholder="有什么新鲜事想分享给大家？"]');
          if (inputElement) {
            inputElement.value = ${JSON.stringify(fullContent)};
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          }
          console.log('Video content filled successfully');
        } catch (error) {
          console.error('Failed to fill video content:', error);
        }
      })()
    `
  }

  /**
   * Article content fill script
   */
  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const content = data.htmlContent || data.markdownContent || ''

    return `
      (async function() {
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) { resolve(element); return; }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) { resolve(element); observer.disconnect(); }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found: ' + selector));
            }, timeout);
          });
        }

        try {
          // Fill title
          const titleInput = await waitForElement('input[placeholder="请输入标题"]');
          if (titleInput) {
            titleInput.value = ${JSON.stringify(title)};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // Fill content
          const contentEditor = document.querySelector('div[contenteditable="true"]');
          if (contentEditor) {
            contentEditor.innerHTML = ${JSON.stringify(content)};
            contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
          }

          console.log('Article content filled successfully');
        } catch (error) {
          console.error('Failed to fill article content:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.weibo.com'
    })
    return cookies.some((c) => c.name === 'SUB')
  }

  async getUserInfo(
    view: BrowserView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('weibo.com')) {
        await view.webContents.loadURL(this.publishUrl)
        await this.waitForNavigation(view)
      }

      return await this.executeScript<{
        username: string
        displayName: string
        avatar: string
      } | null>(
        view,
        `
        (function() {
          try {
            const userCard = document.querySelector('[class*="User_pic"]');
            const avatar = userCard?.querySelector('img')?.src;
            const nameEl = document.querySelector('[class*="User_name"]');
            const displayName = nameEl?.textContent?.trim();
            const profileLink = document.querySelector('a[href*="/u/"]');
            const username = profileLink?.href?.match(/\\/u\\/(\\d+)/)?.[1] || displayName;

            if (displayName) {
              return { username: username || 'weibo_user', displayName, avatar: avatar || '' };
            }
            return null;
          } catch (e) {
            return null;
          }
        })()
      `
      )
    } catch {
      return null
    }
  }

  async navigateToPublishPage(view: BrowserView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.weibo[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('weibo.com')) {
      await view.webContents.loadURL(url)
      await this.waitForNavigation(view)
    }
  }

  async fillContent(
    view: BrowserView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void> {
    await this.executeScript(view, this.getFillScript(contentType, data))
  }

  async submit(view: BrowserView, _contentType?: SyncContentType): Promise<PublishResult> {
    try {
      // Wait 10 seconds before submitting (as per extension logic)
      await this.sleep(10000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const sendButtons = document.querySelectorAll('span.woo-button-content');
          const sendButton = Array.from(sendButtons).find(
            button => button.textContent?.includes('发送') || button.textContent?.includes('发布')
          );

          if (sendButton) {
            sendButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          // Try alternative button selectors
          const altButtons = document.querySelectorAll('button');
          const altButton = Array.from(altButtons).find(
            button => button.textContent?.includes('发送') || button.textContent?.includes('发布')
          );

          if (altButton) {
            altButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          return { clicked: false, error: 'Send button not found' };
        })()
      `
      )

      if (!result.clicked) {
        return { success: false, error: result.error || '未找到发送按钮' }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '发布失败'
      }
    }
  }
}
