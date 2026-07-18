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
 * Douban platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, ARTICLE
 */
export class DoubanAdapter extends BasePlatformAdapter {
  readonly platform = 'douban' as const
  readonly name = '豆瓣'
  readonly publishUrl = 'https://www.douban.com'
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

        // 激活全屏模式
        async function activateFullscreen() {
          try {
            await waitForElement("i.DRE-lite-editor-fullscreen");
            const fullscreenButton = document.querySelector("i.DRE-lite-editor-fullscreen");
            console.debug("fullscreenButton", fullscreenButton);

            if (fullscreenButton) {
              fullscreenButton.click();
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (e) {
            console.debug("error", e);
            console.debug("全屏按钮未找到，继续执行");
          }
        }

        // 填写标题
        async function fillTitle() {
          const title = ${JSON.stringify(title)};
          if (!title) return;

          const titleTextarea = document.querySelector('textarea[placeholder="请输入标题"]');
          console.debug("titleTextarea", titleTextarea);

          if (titleTextarea) {
            titleTextarea.value = title;
            titleTextarea.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        // 填写内容
        async function fillContent() {
          // 查找内容编辑器
          const titleTextarea = document.querySelector('textarea[placeholder="请输入标题"]');
          let contentEditor = titleTextarea?.parentElement?.parentElement?.parentElement?.querySelector(
            'div[aria-placeholder="此刻你想要分享..."]'
          );

          if (!contentEditor) {
            contentEditor = document.querySelector('div[aria-placeholder="此刻你想要分享..."]');
          }

          console.debug("contentEditor", contentEditor);

          if (contentEditor) {
            // 使用粘贴事件填写内容
            const pasteEvent = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer(),
            });

            pasteEvent.clipboardData.setData("text/html", ${JSON.stringify(content)});
            contentEditor.dispatchEvent(pasteEvent);
            contentEditor.dispatchEvent(new Event("click", { bubbles: true }));
            contentEditor.dispatchEvent(new Event("change", { bubbles: true }));

            await new Promise((resolve) => setTimeout(resolve, 500));
            console.debug("内容填写完成");
          } else {
            console.error("未找到内容编辑器");
          }
        }

        // 上传图片
        async function uploadFiles() {
          const images = ${JSON.stringify(images)};
          if (!images || images.length === 0) return;

          const fileInput = document.querySelector('input[type="file"]');
          console.debug("fileInput", fileInput);

          if (!fileInput) {
            console.debug("未找到文件输入元素");
            return;
          }

          const dataTransfer = new DataTransfer();

          for (let i = 0; i < images.length; i++) {
            if (i >= 18) {
              console.debug("最多上传18张图片");
              break;
            }

            const fileInfo = images[i];
            if (!fileInfo.type.startsWith("image/")) {
              console.debug("skip non-image file", fileInfo);
              continue;
            }

            try {
              console.debug("try upload file", fileInfo);
              const response = await fetch(fileInfo.url);
              const arrayBuffer = await response.arrayBuffer();
              const file = new File([arrayBuffer], fileInfo.name, { type: fileInfo.type });
              dataTransfer.items.add(file);
            } catch (error) {
              console.error("上传文件失败:", error);
            }
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));

            console.debug("文件上传操作完成");
            await new Promise((resolve) => setTimeout(resolve, 500));

            // 查找确认上传按钮
            const buttons = document.querySelectorAll('button[type="button"]');
            console.debug("buttons", buttons);

            const confirmButton = Array.from(buttons).find(
              (btn) => btn.textContent?.trim() === "确定上传"
            );

            console.debug("confirmButton", confirmButton);

            if (confirmButton) {
              confirmButton.click();
              await new Promise((resolve) => setTimeout(resolve, 3000));

              // 等待上传完成
              let attempts = 0;
              while (attempts <= 60) {
                attempts++;
                const uploadingElement = document.querySelector(".DRE-upload-status-text.uploading");
                console.debug("uploading", uploadingElement);

                if (uploadingElement) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                } else {
                  break;
                }
              }
            }
          }
        }

        // 主流程
        try {
          await activateFullscreen();
          await fillTitle();
          await fillContent();
          await uploadFiles();
          console.log('豆瓣动态内容填写完成');
        } catch (error) {
          console.error("发布动态失败:", error);
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
          // 等待编辑器加载
          await waitForElement('textarea[placeholder="添加标题"], textarea, #note-editor, .note-editor');
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 填写标题
          const titleInput = document.querySelector('textarea[placeholder="添加标题"], input[name="title"], #note-title, textarea');
          if (titleInput) {
            titleInput.value = ${JSON.stringify(title)};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 填写内容
          const editor = document.querySelector('div[data-contents="true"], div[contenteditable="true"], .note-editor .editable, #note-content');
          if (editor) {
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            pasteEvent.clipboardData.setData('text/html', ${JSON.stringify(htmlContent)});
            editor.dispatchEvent(pasteEvent);
          }

          console.log('豆瓣文章内容填写完成');
        } catch (error) {
          console.error('发布文章失败:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.douban.com'
    })
    // 豆瓣使用 dbcl2 cookie 判断登录状态
    return cookies.some((c) => c.name === 'dbcl2' || c.name === 'ck')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('douban.com')) {
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
            const nameEl = document.querySelector('.nav-user-account .name, #db-global-nav .nav-user-account');
            const avatarEl = document.querySelector('.nav-user-account img, .user-avatar');
            const displayName = nameEl?.textContent?.trim();
            const avatar = avatarEl?.src;
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
      ? PLATFORM_PUBLISH_URLS.douban[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('douban.com')) {
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

          const buttons = document.querySelectorAll('button[type="button"]');
          console.debug("buttons", buttons);

          const sendButton = Array.from(buttons).find((btn) => btn.textContent?.includes("发布"));

          console.debug("sendButton", sendButton);

          if (sendButton) {
            console.debug("sendButton clicked");
            sendButton.click();
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
