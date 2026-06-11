import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  ArticleData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * Substack platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, ARTICLE
 */
export class SubstackAdapter extends BasePlatformAdapter {
  readonly platform = 'substack' as const
  readonly name = 'Substack'
  readonly publishUrl = 'https://substack.com'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC', 'ARTICLE']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
      case 'ARTICLE':
        return this.getArticleFillScript(data as ArticleData)
      default:
        return `console.log('Unsupported content type: ${contentType}')`
    }
  }

  private getDynamicFillScript(data: DynamicData): string {
    const content = data.content || ''
    const title = data.title || ''
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
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 点击 "New post" 按钮打开编辑器
          const newPostButton = await waitForElement('button[type="button"][aria-label="New post"]');
          if (!newPostButton) {
            console.debug('未找到新帖子按钮');
            return;
          }
          newPostButton.click();

          // 等待编辑器出现
          await waitForElement('div[contenteditable="true"]');
          await new Promise(resolve => setTimeout(resolve, 500));

          const editor = document.querySelector('div[contenteditable="true"]');
          if (!editor) {
            console.debug('未找到编辑器元素');
            return;
          }

          // 聚焦编辑器并清空
          editor.focus();
          editor.innerHTML = '';
          await new Promise(resolve => setTimeout(resolve, 500));

          // 通过剪贴板粘贴内容
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          const textContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
          pasteEvent.clipboardData.setData('text/plain', textContent);
          editor.dispatchEvent(pasteEvent);

          const videos = ${JSON.stringify(videos)};
          const images = ${JSON.stringify(images)};
          const hasVideos = videos && videos.length > 0;
          const hasImages = images && images.length > 0;

          if (hasVideos || hasImages) {
            let fileInput = null;
            const filesToUpload = [];

            if (hasVideos) {
              // 如果有视频，只上传第一个视频
              fileInput = document.querySelector('input[type="file"][accept="video/*"]');
              if (fileInput && videos[0]) {
                filesToUpload.push(videos[0]);
              }
            } else if (hasImages) {
              // 上传图片
              fileInput = document.querySelector('input[type="file"][accept="image/*,.heic"]');
              if (fileInput) {
                filesToUpload.push(...images);
              }
            }

            if (fileInput && filesToUpload.length > 0) {
              const dataTransfer = new DataTransfer();

              for (const file of filesToUpload) {
                try {
                  const response = await fetch(file.url);
                  const arrayBuffer = await response.arrayBuffer();
                  const uploadFile = new File([arrayBuffer], file.name, {
                    type: file.type || 'application/octet-stream'
                  });
                  dataTransfer.items.add(uploadFile);
                } catch (error) {
                  console.error('获取文件失败:', error);
                }
              }

              if (dataTransfer.files.length > 0) {
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('Substack 内容填写完成');
        } catch (error) {
          console.error('Substack 发布过程中出错:', error);
        }
      })()
    `
  }

  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const htmlContent = data.htmlContent || ''

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
          // 等待标题输入框
          const titleInput = await waitForElement('input[placeholder="Title"]');
          if (titleInput) {
            titleInput.value = ${JSON.stringify(title)};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 等待编辑器出现
          await waitForElement('div[contenteditable="true"]');
          await new Promise(resolve => setTimeout(resolve, 500));

          const editor = document.querySelector('div[contenteditable="true"]');
          if (!editor) {
            console.debug('未找到编辑器元素');
            return;
          }

          editor.focus();
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/html', ${JSON.stringify(htmlContent)});
          editor.dispatchEvent(pasteEvent);

          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('Substack 文章内容填写完成');
        } catch (error) {
          console.error('Substack 文章发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.substack.com'
    })
    return cookies.some((c) => c.name === 'substack.sid')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      return await this.executeScript<{
        username: string
        displayName: string
        avatar: string
      } | null>(
        view,
        `
        (function() {
          try {
            return { username: 'substack_user', displayName: 'Substack User', avatar: '' };
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

  async navigateToPublishPage(view: WebContentsView, _contentType?: SyncContentType): Promise<void> {
    await view.webContents.loadURL(this.publishUrl + '/notes')
    await this.waitForNavigation(view)
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
      await this.sleep(3000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const buttons = document.querySelectorAll('button');
          const sendButton = Array.from(buttons).find(btn => btn.textContent?.includes('Post'));

          if (sendButton) {
            sendButton.dispatchEvent(new Event('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          return { clicked: false, error: '未找到发布按钮' };
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
