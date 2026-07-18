import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  ArticleData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * SSPai (少数派) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: ARTICLE
 */
export class SspaiAdapter extends BasePlatformAdapter {
  readonly platform = 'sspai' as const
  readonly name = '少数派'
  readonly publishUrl = 'https://sspai.com'
  readonly supportedContentTypes: SyncContentType[] = ['ARTICLE']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'ARTICLE':
        return this.getArticleFillScript(data as ArticleData)
      default:
        return `console.log('Unsupported content type: ${contentType}')`
    }
  }

  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const markdownContent = data.markdownContent || ''
    const cover = data.cover

    return `
      (async function() {
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
              return;
            }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) {
                resolve(element);
                observer.disconnect();
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true,
            });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element with selector "' + selector + '" not found within ' + timeout + 'ms'));
            }, timeout);
          });
        }

        async function findElementByText(selector, text, maxRetries = 5, retryInterval = 1000) {
          for (let i = 0; i < maxRetries; i++) {
            const elements = document.querySelectorAll(selector);
            const element = Array.from(elements).find((element) => element.textContent?.includes(text));

            if (element) {
              return element;
            }

            console.log('未找到包含文本 "' + text + '" 的元素，尝试次数：' + (i + 1));
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
          }

          console.error('在 ' + maxRetries + ' 次尝试后未找到包含文本 "' + text + '" 的元素');
          return null;
        }

        const cover = ${JSON.stringify(cover)};

        // 上传封面图片
        async function uploadCoverImage() {
          if (!cover) {
            console.debug('没有封面图片需要上传');
            return true;
          }

          try {
            const fileInput = document.querySelector('input[type="file"]');
            if (!fileInput) {
              console.debug('未找到文件上传输入框');
              return false;
            }

            const dataTransfer = new DataTransfer();
            const coverImage = cover;

            console.debug('开始上传文件', coverImage);

            // 从blob URL获取文件内容并创建File对象
            const response = await fetch(coverImage.url);
            const arrayBuffer = await response.arrayBuffer();
            const file = new File([arrayBuffer], coverImage.name, { type: coverImage.type });

            // 添加文件到DataTransfer对象
            dataTransfer.items.add(file);
            console.debug('文件已准备');

            if (dataTransfer.files.length > 0) {
              // 设置文件输入框的files属性并触发change事件
              fileInput.files = dataTransfer.files;
              const changeEvent = new Event('change', { bubbles: true });
              fileInput.dispatchEvent(changeEvent);
              console.debug('文件上传操作完成');
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));

            const cutAndUseButtonSpan = await findElementByText('span', '裁切并使用');
            if (cutAndUseButtonSpan) {
              const cutAndUseButton = cutAndUseButtonSpan.parentElement;
              if (cutAndUseButton) {
                const clickEvent = new Event('click', { bubbles: true });
                cutAndUseButton.dispatchEvent(clickEvent);
              }
            }

            return true;
          } catch (error) {
            console.error('上传封面图片失败:', error);
            return false;
          }
        }

        // 填充文章内容
        async function fillArticleContent() {
          // 等待标题输入框出现
          const titleTextarea = await waitForElement('textarea[placeholder="请输入标题..."]');
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 设置标题
          titleTextarea.value = ${JSON.stringify(title.slice(0, 100))};
          titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          console.debug('titleTextarea', titleTextarea, titleTextarea.value);

          // 等待编辑器加载
          const editorDiv = await waitForElement('div[contenteditable="true"]');
          if (!editorDiv) {
            console.debug('未找到编辑器元素');
            return false;
          }

          const editor = editorDiv.querySelector('p');
          if (!editor) {
            console.debug('未找到编辑器元素');
            return false;
          }

          // 填充内容
          editor.focus();
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
          });
          pasteEvent.clipboardData.setData('text/plain', ${JSON.stringify(markdownContent)});
          editor.dispatchEvent(pasteEvent);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));

          await new Promise((resolve) => setTimeout(resolve, 3000));

          const convertButtonSpan = await findElementByText('span', '立即转换');
          if (convertButtonSpan) {
            const convertButton = convertButtonSpan.parentElement;
            if (convertButton) {
              const clickEvent = new Event('click', { bubbles: true });
              convertButton.dispatchEvent(clickEvent);
            }
          }
          return true;
        }

        // 主流程
        try {
          // 上传封面图片
          await uploadCoverImage();

          const contentFilled = await fillArticleContent();
          if (!contentFilled) {
            throw new Error('填充文章内容失败');
          }

          // 点击预览按钮
          const previewButton = document.querySelector('a.editor-extra-button-preview') ||
            await findElementByText('button', '预览');
          console.debug('previewButton', previewButton);

          if (previewButton) {
            console.debug('previewButton clicked');
            const clickEvent = new Event('click', { bubbles: true });
            previewButton.dispatchEvent(clickEvent);
          } else {
            console.debug('未找到"预览"按钮');
          }

          console.log('文章内容填写完成');
        } catch (error) {
          console.error('发布文章失败:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.sspai.com'
    })
    return cookies.some((c) => c.name === 'sspai_jwt_token' || c.name === 'sspai_cross_token')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('sspai.com')) {
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
            const avatar = document.querySelector('.user-avatar img')?.src || document.querySelector('.avatar img')?.src;
            const nameEl = document.querySelector('.user-name') || document.querySelector('.nickname');
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
      ? PLATFORM_PUBLISH_URLS.sspai[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('sspai.com')) {
      await view.webContents.loadURL(url)
      await this.waitForNavigation(view)
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
      await this.sleep(10000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 查找发布按钮
          async function findElementByText(selector, text) {
            const elements = document.querySelectorAll(selector);
            return Array.from(elements).find((element) => element.textContent?.includes(text));
          }

          const publishButton = await findElementByText('button', '发布');

          if (publishButton) {
            publishButton.click();
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
