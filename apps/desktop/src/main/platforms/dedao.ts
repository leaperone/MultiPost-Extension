import type { BrowserView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Dedao (iGet) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class DedaoAdapter extends BasePlatformAdapter {
  readonly platform = 'dedao' as const
  readonly name = '得到'
  readonly publishUrl = 'https://www.dedao.cn'
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

        // 填写内容
        async function fillContent() {
          await waitForElement("div#richEditor");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const editor = document.querySelector("div#richEditor");
          if (editor) {
            // 清空编辑器内容
            editor.innerHTML = "";
            editor.focus();

            // 如果有标题，将标题和内容拼接
            const fullContent = ${JSON.stringify(title)} ? ${JSON.stringify(title)} + "\\n\\n" + ${JSON.stringify(content)} : ${JSON.stringify(content)};

            // 使用 ClipboardEvent 来粘贴内容
            const clipboardEvent = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer(),
            });
            clipboardEvent.clipboardData?.setData("text/plain", fullContent || "");
            editor.dispatchEvent(clipboardEvent);
          } else {
            console.debug("未找到编辑器元素");
          }
        }

        // 上传图片
        async function uploadFiles() {
          const images = ${JSON.stringify(images)};
          if (!images || images.length === 0) return;

          const fileInput = document.querySelector('input[type="file"]');
          if (!fileInput) {
            console.debug("未找到文件输入元素");
            return;
          }

          const dataTransfer = new DataTransfer();

          for (let i = 0; i < images.length; i++) {
            if (i >= 9) {
              // 得到最多支持9张图片
              console.debug("最多上传9张图片");
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
              console.debug("uploaded");
            } catch (error) {
              console.error("上传文件失败:", error);
            }
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));
            console.debug("文件上传操作完成");
          }
        }

        // 主流程
        try {
          await fillContent();
          await uploadFiles();
          console.log('得到动态内容填写完成');
        } catch (error) {
          console.error("发布动态失败:", error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.dedao.cn'
    })
    // 得到使用 token 或 session cookie 判断登录状态
    return cookies.some(
      (c) => c.name === 'token' || c.name === 'PHPSESSID' || c.name === '_ga_user_id'
    )
  }

  async getUserInfo(
    view: BrowserView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('dedao.cn')) {
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
            const nameEl = document.querySelector('.user-name, .nickname, .author-name');
            const avatarEl = document.querySelector('.user-avatar img, .avatar img');
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

  async navigateToPublishPage(view: BrowserView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.dedao[contentType] || PLATFORM_PUBLISH_URLS.dedao.DYNAMIC
      : PLATFORM_PUBLISH_URLS.dedao.DYNAMIC

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('dedao.cn/knowledge')) {
      await view.webContents.loadURL(url || 'https://www.dedao.cn/knowledge/home')
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
      await this.sleep(10000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          // 等待图片上传完成
          await new Promise((resolve) => setTimeout(resolve, 3000));
          let retryCount = 0;
          while (retryCount++ < 30) {
            const loadingText = document.querySelector(".pc-file__list-item__loading-text");
            if (!loadingText) break;
            console.debug("等待图片上传完成，尝试 " + retryCount + "/30");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const sendButtons = document.querySelectorAll("span.submit");
          const sendButton = Array.from(sendButtons).find((button) => button.textContent?.includes("发布"));

          if (sendButton) {
            console.debug("sendButton clicked");
            sendButton.dispatchEvent(new Event("click", { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          // 尝试其他按钮
          const buttons = document.querySelectorAll('button');
          const publishButton = Array.from(buttons).find(
            button => button.textContent?.includes('发布')
          );

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
