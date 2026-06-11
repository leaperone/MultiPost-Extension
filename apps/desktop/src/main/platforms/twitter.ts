import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Twitter/X platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC only
 */
export class TwitterAdapter extends BasePlatformAdapter {
  readonly platform = 'twitter' as const
  readonly name = 'Twitter/X'
  readonly publishUrl = 'https://x.com/compose/post'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC']

  /**
   * Get JavaScript code to fill content into Twitter publish form
   */
  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
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
    const fullText = title ? `${title}\n${content}` : content
    const images = data.images || []
    const videos = data.videos || []

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
          const images = ${JSON.stringify(images)};
          const videos = ${JSON.stringify(videos)};

          // Wait for editor
          await waitForElement('div[data-contents="true"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Get editor and focus
          const editor = document.querySelector('div[data-contents="true"]');
          if (!editor) {
            throw new Error('Editor not found');
          }

          editor.focus();

          // Use paste event to insert text
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/plain', ${JSON.stringify(fullText)});
          editor.dispatchEvent(pasteEvent);

          // 处理媒体上传（图片和视频）
          const mediaFiles = [...(images || []), ...(videos || [])];
          if (mediaFiles.length > 0) {
            const fileInput = document.querySelector('input[type="file"]');
            if (!fileInput) {
              console.debug('未找到文件输入元素');
            } else {
              const dataTransfer = new DataTransfer();

              // X 最多支持 4 张媒体
              for (let i = 0; i < mediaFiles.length && i < 4; i++) {
                const fileInfo = mediaFiles[i];
                console.debug('try upload file', fileInfo);

                try {
                  const response = await fetch(fileInfo.url);
                  if (!response.ok) throw new Error('HTTP error: ' + response.status);
                  const arrayBuffer = await response.arrayBuffer();
                  const file = new File([arrayBuffer], fileInfo.name, { type: fileInfo.type });
                  console.log('file', file);
                  dataTransfer.items.add(file);
                } catch (error) {
                  console.error('上传文件失败:', fileInfo.url, error);
                }
              }

              if (dataTransfer.files.length > 0) {
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                console.debug('文件上传操作完成');
              }
            }
          }

          console.log('Dynamic content filled successfully');
        } catch (error) {
          console.error('Failed to fill dynamic content:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.x.com'
    })
    // Also check twitter.com for backward compatibility
    const twitterCookies = await view.webContents.session.cookies.get({
      domain: '.twitter.com'
    })
    return (
      cookies.some((c) => c.name === 'auth_token') ||
      twitterCookies.some((c) => c.name === 'auth_token')
    )
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('x.com') && !currentUrl.includes('twitter.com')) {
        await view.webContents.loadURL('https://x.com/home')
        await this.waitForNavigation(view)
        await this.sleep(3000)
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
            // Try to get user info from the sidebar
            const userCell = document.querySelector('[data-testid="UserCell"]');
            const avatar = userCell?.querySelector('img')?.src || '';
            const displayName = userCell?.querySelector('[dir="ltr"]')?.textContent?.trim() || '';
            const handle = userCell?.querySelector('[dir="ltr"] span')?.textContent?.replace('@', '') || '';

            if (handle) {
              return { username: handle, displayName, avatar };
            }

            // Alternative: get from profile link
            const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
            const href = profileLink?.getAttribute('href');
            const username = href?.replace('/', '') || '';

            if (username) {
              return { username, displayName: '', avatar: '' };
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

  async navigateToPublishPage(view: WebContentsView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.twitter?.[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('x.com/compose') && !currentUrl.includes('twitter.com/compose')) {
      await view.webContents.loadURL(url)
      await this.waitForNavigation(view)
      await this.sleep(2000)
    }
  }

  async fillContent(
    view: WebContentsView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void> {
    await this.executeScript(view, this.getFillScript(contentType, data))
  }

  async submit(view: WebContentsView, _contentType?: SyncContentType): Promise<PublishResult> {
    try {
      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          // Wait for content to be ready
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Find post button by text (supports multiple languages)
          const allButtons = document.querySelectorAll('button');
          const publishButton = Array.from(allButtons).find(
            button =>
              button.textContent?.includes('发帖') ||
              button.textContent?.includes('Post') ||
              button.textContent?.includes('發佈') ||
              button.textContent?.includes('ポスト')
          );

          if (publishButton) {
            // Wait for button to be enabled
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              attempts++;
            }

            if (publishButton.disabled) {
              return { clicked: false, error: 'Post button is still disabled' };
            }

            publishButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          // Try keyboard shortcut as fallback (Cmd+Enter)
          const editor = document.querySelector('div[data-contents="true"]');
          if (editor) {
            editor.focus();
            const keyEvent = new KeyboardEvent('keydown', {
              bubbles: true,
              cancelable: true,
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              metaKey: true,
              composed: true
            });
            editor.dispatchEvent(keyEvent);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          return { clicked: false, error: 'Post button not found' };
        })()
      `
      )

      if (!result.clicked) {
        return { success: false, error: result.error || '未找到发布按钮' }
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
