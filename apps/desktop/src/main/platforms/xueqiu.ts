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
 * Xueqiu platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, ARTICLE
 */
export class XueqiuAdapter extends BasePlatformAdapter {
  readonly platform = 'xueqiu' as const
  readonly name = '雪球'
  readonly publishUrl = 'https://xueqiu.com'
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

        async function uploadFiles(files) {
          const fileInput = await waitForElement('input[type="file"]');
          if (!fileInput) {
            console.error('未找到文件输入元素');
            return;
          }

          const dataTransfer = new DataTransfer();
          for (const file of files) {
            dataTransfer.items.add(file);
          }

          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.debug('文件上传操作完成');
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
                reject(new Error('未能在超时时间内找到足够元素'));
                return;
              }

              setTimeout(checkElements, 100);
            };
            checkElements();
          });
        }

        try {
          // 等待并点击占位元素
          const placeholder = await waitForElement('div[class="fake-placeholder"]');
          placeholder.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 修改填写内容的部分
          const inputElement = await waitForElement('div[class="medium-editor-element"][contenteditable="true"]');
          const fullContent = ${JSON.stringify(title + '\n' + content)};

          // 使用粘贴事件输入内容
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/plain', fullContent);
          inputElement.focus();
          inputElement.dispatchEvent(pasteEvent);

          console.debug('成功填入雪球内容');

          // 处理图片上传
          const images = ${JSON.stringify(images)};
          if (images && images.length > 0) {
            const imageFiles = await Promise.all(
              images.map(async (file) => {
                const response = await fetch(file.url);
                const blob = await response.blob();
                return new File([blob], file.name, { type: file.type });
              })
            );
            const currentUploaded = document.querySelectorAll('.img-single-upload');
            await uploadFiles(imageFiles);
            await waitForElements('.img-single-upload', images.length + currentUploaded.length);
          }

          console.debug('成功填入雪球内容和图片');

          // 等待一段时间后尝试发布
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('雪球动态内容填写完成');
        } catch (error) {
          console.error('填入雪球内容或上传图片时出错:', error);
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

        // 显示同步提示
        const host = document.createElement('div');
        const tip = document.createElement('div');

        host.style.position = 'fixed';
        host.style.bottom = '20px';
        host.style.right = '20px';
        host.style.zIndex = '9999';
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });

        tip.innerHTML = \`
          <style>
            .float-tip {
              background: #1e293b;
              color: white;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          </style>
          <div class="float-tip">
            正在同步文章到雪球...
          </div>
        \`;
        shadow.appendChild(tip);

        try {
          // 等待标题输入框出现
          await waitForElement('textarea[placeholder="请输入标题"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 填写标题
          const titleTextarea = document.querySelector('textarea[placeholder="请输入标题"]');
          if (titleTextarea) {
            titleTextarea.value = ${JSON.stringify(title.slice(0, 100))};
            titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 查找编辑器元素
          const editor = document.querySelector('div.ProseMirror[contenteditable="true"]');
          if (!editor) {
            console.debug('未找到编辑器元素');
            return;
          }

          // 点击编辑器
          editor.click();

          // 模拟粘贴内容
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/html', ${JSON.stringify(htmlContent)});
          editor.dispatchEvent(pasteEvent);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));

          // 等待内容加载
          await new Promise(resolve => setTimeout(resolve, 5000));

          // 如果有封面图片，上传
          const cover = ${JSON.stringify(data.cover)};
          if (cover) {
            const fileInputs = document.querySelectorAll('input[type="file"][accept="image/gif, image/jpeg, image/png"]');
            const fileInput = fileInputs[fileInputs.length - 1];

            if (fileInput) {
              const dataTransfer = new DataTransfer();
              const response = await fetch(cover.url);
              const arrayBuffer = await response.arrayBuffer();
              const file = new File([arrayBuffer], cover.name, { type: cover.type });
              dataTransfer.items.add(file);

              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              fileInput.dispatchEvent(new Event('input', { bubbles: true }));

              await new Promise(resolve => setTimeout(resolve, 3000));

              // 查找确认裁剪按钮
              const confirmButtons = document.querySelectorAll('button');
              const confirmButton = Array.from(confirmButtons).find(button => button.textContent?.includes('确认裁剪'));
              if (confirmButton) {
                confirmButton.dispatchEvent(new Event('click', { bubbles: true }));
              }
            }
          }

          const floatTip = tip.querySelector('.float-tip');
          floatTip.textContent = '内容已填写完成';

          setTimeout(() => {
            if (document.body.contains(host)) {
              document.body.removeChild(host);
            }
          }, 3000);

          console.log('雪球文章内容填写完成');
        } catch (error) {
          const floatTip = tip.querySelector('.float-tip');
          floatTip.textContent = '同步失败，请重试';
          floatTip.style.backgroundColor = '#dc2626';

          setTimeout(() => {
            document.body.removeChild(host);
          }, 3000);

          console.error('发布文章失败:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.xueqiu.com'
    })
    return cookies.some((c) => c.name === 'u' || c.name === 'xq_a_token')
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
            const avatar = document.querySelector('.nav__user__avatar img')?.src;
            const nameEl = document.querySelector('.nav__user__name');
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
      ? PLATFORM_PUBLISH_URLS.xueqiu[contentType] || this.publishUrl
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

  async submit(view: WebContentsView, contentType?: SyncContentType): Promise<PublishResult> {
    try {
      await this.sleep(5000)

      const buttonSelector =
        contentType === 'ARTICLE' ? 'button' : 'a[class="lite-editor__submit"]'

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const maxAttempts = 3;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              let sendButton;
              if (${JSON.stringify(contentType === 'ARTICLE')}) {
                const buttons = document.querySelectorAll('button');
                sendButton = Array.from(buttons).find(btn => btn.textContent?.includes('发布'));
              } else {
                sendButton = document.querySelector('${buttonSelector}');
              }

              if (sendButton) {
                sendButton.click();
                await new Promise(resolve => setTimeout(resolve, 3000));
                return { clicked: true };
              }

              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              console.warn('尝试查找发送按钮失败:', error);
              if (attempt === maxAttempts - 1) {
                return { clicked: false, error: '达到最大尝试次数，无法找到发送按钮' };
              }
            }
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
