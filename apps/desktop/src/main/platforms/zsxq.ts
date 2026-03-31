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
 * ZSXQ (Zhishixingqiu / Knowledge Planet) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class ZsxqAdapter extends BasePlatformAdapter {
  readonly platform = 'zsxq' as const
  readonly name = '知识星球'
  readonly publishUrl = 'https://wx.zsxq.com'
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

    // 拼接标题和内容
    const postContent = title ? `${title}\n${content}` : content

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
          // 等待帖子头部元素
          const postTopicHead = await waitForElement(".post-topic-head");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 点击发帖按钮
          console.debug("postTopicHead", postTopicHead);
          if (!postTopicHead) {
            console.debug("未找到帖子头部元素");
            return;
          }

          postTopicHead.click();
          const clickEvent = new Event("click", { bubbles: true });
          postTopicHead.dispatchEvent(clickEvent);
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // 找到编辑器并填写内容
          const editor = document.querySelector(".ql-editor");
          console.debug("editor", editor);
          if (!editor) {
            console.debug("未找到编辑器元素");
            return;
          }

          editor.innerHTML = "";
          await new Promise((resolve) => setTimeout(resolve, 500));
          editor.focus();

          // 粘贴内容
          const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
          });
          pasteEvent.clipboardData.setData("text/plain", ${JSON.stringify(postContent)});
          editor.dispatchEvent(pasteEvent);
          await new Promise((resolve) => setTimeout(resolve, 100));
          editor.blur();
          await new Promise((resolve) => setTimeout(resolve, 500));

          console.debug("editor-->", editor, editor.textContent);

          // 处理图片上传
          const images = ${JSON.stringify(images)};
          if (images && images.length > 0) {
            const fileInput = document.querySelector('input[type="file"]');
            console.debug("fileInput", fileInput);
            if (!fileInput) {
              console.debug("未找到文件输入元素");
              return;
            }

            const dataTransfer = new DataTransfer();
            for (const image of images) {
              if (!image.type.startsWith("image/")) continue;

              console.debug("try upload file", image);
              const response = await fetch(image.url);
              const arrayBuffer = await response.arrayBuffer();
              const file = new File([arrayBuffer], image.name, { type: image.type });
              dataTransfer.items.add(file);
              console.debug("uploaded");
            }

            if (dataTransfer.files.length > 0) {
              fileInput.files = dataTransfer.files;
              const changeEvent = new Event("change", { bubbles: true });
              fileInput.dispatchEvent(changeEvent);
              const inputEvent = new Event("input", { bubbles: true });
              fileInput.dispatchEvent(inputEvent);
              console.debug("文件上传操作完成");
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
          }

          console.log('知识星球内容填写完成');
        } catch (error) {
          console.error("发布内容时出错:", error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.zsxq.com'
    })
    // 知识星球使用 zsxq_access_token 或 abtest_env cookie 判断登录状态
    return cookies.some((c) => c.name === 'zsxq_access_token' || c.name === 'sensorsdata2015jssdkcross')
  }

  async getUserInfo(
    view: BrowserView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('zsxq.com')) {
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
            const nameEl = document.querySelector('.user-name, .nickname, .author-info-name');
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
      ? PLATFORM_PUBLISH_URLS.zsxq[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('zsxq.com')) {
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
      await this.sleep(10000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 发布内容
          const submitButtons = document.querySelectorAll(".submit-btn");
          const publishButton = Array.from(submitButtons).find((el) => el.textContent?.includes("发布"));
          console.debug("publishButton", publishButton);

          if (publishButton) {
            console.debug("publishButton clicked");
            const clickEvent = new Event("click", { bubbles: true });
            publishButton.dispatchEvent(clickEvent);
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
