import type { BrowserView } from 'electron'
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
 * Toutiao platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, ARTICLE
 */
export class ToutiaoAdapter extends BasePlatformAdapter {
  readonly platform = 'toutiao' as const
  readonly name = '头条'
  readonly publishUrl = 'https://mp.toutiao.com'
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
          // 等待编辑器出现
          const editor = await waitForElement('div[contenteditable="true"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          if (editor) {
            // 更新编辑器内容，将标题和内容合并
            const combinedContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n\n' + content)} : ${JSON.stringify(content)};
            editor.innerText = combinedContent;
            editor.focus();
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          // 清除已有图片
          for (let i = 0; i < 20; i++) {
            const closeButton = document.querySelector('.image-remove-btn');
            if (!closeButton) break;
            closeButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // 处理图片上传
          const images = ${JSON.stringify(images)};
          if (images?.length > 0) {
            const uploadButtons = document.querySelectorAll('button.syl-toolbar-button');
            const uploadButton = Array.from(uploadButtons).find(button => button.textContent?.includes('图片'));

            if (uploadButton) {
              uploadButton.dispatchEvent(new Event('click', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 1000));

              const fileInput = document.querySelector('input[type="file"]');
              if (fileInput) {
                const dataTransfer = new DataTransfer();

                for (const image of images) {
                  if (!image.type.startsWith('image/')) {
                    continue;
                  }

                  const response = await fetch(image.url);
                  const arrayBuffer = await response.arrayBuffer();
                  const file = new File([arrayBuffer], image.name, { type: image.type });
                  dataTransfer.items.add(file);
                }

                if (dataTransfer.files.length > 0) {
                  fileInput.files = dataTransfer.files;
                  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                  fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // 等待上传完成
                await new Promise(resolve => setTimeout(resolve, 5000));

                // 点击确认按钮
                const confirmButton = document.querySelector('button[data-e2e="imageUploadConfirm-btn"]');
                if (confirmButton) {
                  confirmButton.dispatchEvent(new Event('click', { bubbles: true }));
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            }
          }

          console.log('头条动态内容填写完成');
        } catch (error) {
          console.error('头条发布过程中出错:', error);
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
          await waitForElement('div[contenteditable="true"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 处理标题
          const titleTextarea = document.querySelector('textarea[placeholder="请输入文章标题（2～30个字）"]');
          if (titleTextarea) {
            titleTextarea.value = ${JSON.stringify(title.slice(0, 30))};
            titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 处理内容
          const editor = document.querySelector('div[contenteditable="true"]');
          if (!editor) {
            console.log('未找到编辑器元素');
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
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));

          await new Promise(resolve => setTimeout(resolve, 5000));

          // 处理封面
          const cover = ${JSON.stringify(data.cover)};
          if (cover) {
            // 清除现有封面
            for (let i = 0; i < 20; i++) {
              const closeButton = document.querySelector('.article-cover-delete');
              if (!closeButton) break;
              closeButton.click();
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 上传新封面
            const uploadButton = document.querySelector('div[class="article-cover-add"]');
            if (uploadButton) {
              uploadButton.dispatchEvent(new Event('click', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 1000));

              // 切换到上传图片标签
              const tabs = document.querySelectorAll('div.byte-tabs-header-title');
              const uploadTab = Array.from(tabs).find(tab => tab.textContent?.includes('上传图片'));
              if (uploadTab) {
                uploadTab.dispatchEvent(new Event('click', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 1000));
              }

              // 上传文件
              const fileInput = document.querySelector('input[type="file"]');
              if (fileInput) {
                const dataTransfer = new DataTransfer();
                const response = await fetch(cover.url);
                const buffer = await response.arrayBuffer();
                const file = new File([buffer], cover.name, { type: cover.type });
                dataTransfer.items.add(file);

                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                fileInput.dispatchEvent(new Event('input', { bubbles: true }));

                await new Promise(resolve => setTimeout(resolve, 5000));

                // 确认上传
                const confirmButton = document.querySelector('button[data-e2e="imageUploadConfirm-btn"]');
                if (confirmButton) {
                  confirmButton.dispatchEvent(new Event('click', { bubbles: true }));
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            }
          }

          console.log('头条文章内容填写完成');
        } catch (error) {
          console.error('发布文章失败:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.toutiao.com'
    })
    return cookies.some((c) => c.name === 'sso_uid' || c.name === 'sessionid')
  }

  async getUserInfo(
    view: BrowserView
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
            const avatar = document.querySelector('.user-avatar img')?.src;
            const nameEl = document.querySelector('.user-name');
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

  async navigateToPublishPage(view: BrowserView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.toutiao[contentType] || this.publishUrl
      : this.publishUrl

    await view.webContents.loadURL(url)
    await this.waitForNavigation(view)
  }

  async fillContent(
    view: BrowserView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void> {
    await this.executeScript(view, this.getFillScript(contentType, data))
  }

  async submit(view: BrowserView, contentType?: SyncContentType): Promise<PublishResult> {
    try {
      await this.sleep(5000)

      const buttonSelector =
        contentType === 'ARTICLE' ? 'button.publish-btn' : 'button.publish-content'

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const buttons = document.querySelectorAll('${buttonSelector}');
          const publishButton = Array.from(buttons).find(btn =>
            btn.textContent?.includes('预览并发布') || btn.textContent?.includes('发布')
          );

          if (publishButton) {
            publishButton.dispatchEvent(new Event('click', { bubbles: true }));
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
