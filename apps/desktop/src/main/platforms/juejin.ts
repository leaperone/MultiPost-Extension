import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  ArticleData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Juejin platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, ARTICLE
 */
export class JuejinAdapter extends BasePlatformAdapter {
  readonly platform = 'juejin' as const
  readonly name = '掘金'
  readonly publishUrl = 'https://juejin.cn'
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
    const images = data.images || []

    return `
      (async function() {
        console.log('Juejin Dynamic 函数被调用');

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
          // 等待页面加载
          await waitForElement("div[contenteditable='true']");

          // 填写内容
          const textarea = document.querySelector("div[contenteditable='true']");
          if (textarea) {
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            pasteEvent.clipboardData?.setData('text/plain', ${JSON.stringify(content)});
            textarea.dispatchEvent(pasteEvent);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 上传图片
          const images = ${JSON.stringify(images)};
          if (images && images.length > 0) {
            const fileInput = document.querySelector('input[type="file"]');

            if (fileInput) {
              const dataTransfer = new DataTransfer();
              for (let i = 0; i < images.length; i++) {
                if (i >= 9) {
                  console.debug('最多上传9张图片');
                  break;
                }
                const fileData = images[i];
                if (!fileData.type.startsWith('image/')) {
                  continue;
                }
                try {
                  const response = await fetch(fileData.url);
                  const arrayBuffer = await response.arrayBuffer();
                  const file = new File([arrayBuffer], fileData.name, { type: fileData.type });
                  dataTransfer.items.add(file);
                } catch (error) {
                  console.error('获取文件失败:', error);
                }
              }

              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              fileInput.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          console.log('掘金动态内容填写完成');
        } catch (error) {
          console.error('Juejin Dynamic 发布过程中出错:', error);
        }
      })()
    `
  }

  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const htmlContent = data.htmlContent || ''

    return `
      (async function() {
        console.log('Juejin Article 函数被调用');

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
          // 等待标题输入框出现
          await waitForElement('input[placeholder="输入文章标题..."]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 设置标题
          const titleInput = document.querySelector('input[placeholder="输入文章标题..."]');
          if (titleInput) {
            titleInput.value = ${JSON.stringify(title.slice(0, 100))};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 等待编辑器加载
          const editor = document.querySelector('div.CodeMirror-code[role="presentation"]');
          if (!editor) {
            console.debug('未找到编辑器元素');
            return;
          }

          // 聚焦编辑器并粘贴内容
          editor.focus();
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData?.setData('text/html', ${JSON.stringify(htmlContent)});
          editor.dispatchEvent(pasteEvent);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));

          // 等待内容渲染
          await new Promise(resolve => setTimeout(resolve, 5000));

          console.log('掘金文章内容填写完成');
        } catch (error) {
          console.error('Juejin Article 发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.juejin.cn'
    })
    return cookies.some((c) => c.name === 'sessionid' || c.name === 'sessionid_ss')
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
            const avatar = document.querySelector('.avatar-wrapper img')?.src;
            const nameEl = document.querySelector('.username');
            const displayName = nameEl?.textContent?.trim();
            if (displayName) {
              return { username: displayName, displayName, avatar: avatar || '' };
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
      ? PLATFORM_PUBLISH_URLS.juejin[contentType] || this.publishUrl
      : this.publishUrl

    await view.webContents.loadURL(url)
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
      await this.sleep(5000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const buttons = document.querySelectorAll('button');
          const sendButton = Array.from(buttons).find(btn =>
            btn.textContent?.includes('发布') || btn.textContent?.includes(' 发布 ')
          );

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
