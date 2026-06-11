import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, DynamicData } from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * Reddit platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class RedditAdapter extends BasePlatformAdapter {
  readonly platform = 'reddit' as const
  readonly name = 'Reddit'
  readonly publishUrl = 'https://www.reddit.com/submit'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
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
        console.log('Reddit 函数被调用');

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
          await waitForElement('faceplate-textarea-input');

          const mediaFiles = [...${JSON.stringify(images)}, ...${JSON.stringify(videos)}];

          // 如果有媒体文件，点击 Image & Video 标签
          if (mediaFiles.length > 0) {
            const tablist = document
              .querySelector('r-post-type-select')
              ?.shadowRoot?.querySelector("div[role='tablist']")
              ?.querySelectorAll('faceplate-tracker');

            if (tablist && tablist.length > 1) {
              const tabButton = tablist[1].querySelector('button');
              if (tabButton) {
                tabButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }

          // 填写标题
          const titleTextarea = document
            .querySelector('faceplate-textarea-input')
            ?.shadowRoot?.querySelector('textarea[id="innerTextArea"]');

          if (!titleTextarea) {
            console.debug('未找到标题元素');
            return;
          }
          titleTextarea.value = ${JSON.stringify(title.slice(0, 300))};
          titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));

          // 上传媒体文件
          if (mediaFiles.length > 0) {
            const fileInput = document
              .querySelector('r-post-media-input')
              ?.shadowRoot?.querySelector('input');

            if (fileInput) {
              const dataTransfer = new DataTransfer();
              for (const fileData of mediaFiles) {
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
            }
          }

          // 填写内容 - 查找第三个 contenteditable div
          const editors = document.querySelectorAll('div[contenteditable="true"]');
          if (editors && editors.length > 2) {
            const editor = editors[2];
            editor.focus();
            await new Promise(resolve => setTimeout(resolve, 1000));

            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            pasteEvent.clipboardData?.setData('text/plain', ${JSON.stringify(content)});
            editor.dispatchEvent(pasteEvent);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            editor.dispatchEvent(new Event('change', { bubbles: true }));
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('Reddit 内容填写完成');
        } catch (error) {
          console.error('Reddit 发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.reddit.com'
    })
    return cookies.some((c) => c.name === 'reddit_session' || c.name === 'token_v2')
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
            return { username: 'reddit_user', displayName: 'Reddit User', avatar: '' };
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
    await view.webContents.loadURL(this.publishUrl)
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

          const submitButton = document.querySelector('r-post-form-submit-button#submit-post-button');
          if (submitButton) {
            const innerButton = submitButton.shadowRoot?.querySelector('button');
            if (innerButton) {
              innerButton.click();
              await new Promise(resolve => setTimeout(resolve, 3000));
              return { clicked: true };
            }
          }

          return { clicked: false, error: '未找到提交按钮' };
        })()
      `
      )

      if (!result.clicked) {
        return { success: false, error: result.error || '未找到提交按钮' }
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
