import type { BrowserView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  VideoData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Xiaoheihe (Black Box) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 */
export class XiaoheiheAdapter extends BasePlatformAdapter {
  readonly platform = 'xiaoheihe' as const
  readonly name = '小黑盒'
  readonly publishUrl = 'https://www.xiaoheihe.cn'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC', 'VIDEO']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
      case 'VIDEO':
        return this.getVideoFillScript(data as VideoData)
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
          const titleEditorSelector = "div.hb-cpt__editor-title .ProseMirror.hb-editor";
          const contentEditorSelector = "div.image-text__edit-content .ProseMirror.hb-editor";

          // 等待编辑器元素出现
          await waitForElement(contentEditorSelector);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 填写标题
          const title = ${JSON.stringify(title)};
          if (title) {
            try {
              await waitForElement(titleEditorSelector);
              const titleEditor = document.querySelector(titleEditorSelector);
              if (titleEditor) {
                titleEditor.focus();
                const titlePasteEvent = new ClipboardEvent("paste", {
                  bubbles: true,
                  cancelable: true,
                  clipboardData: new DataTransfer(),
                });
                titlePasteEvent.clipboardData.setData("text/plain", title);
                titleEditor.dispatchEvent(titlePasteEvent);
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            } catch {
              console.debug("未找到标题编辑器元素, 跳过标题填写");
            }
          }

          // 填写正文
          const contentEditor = document.querySelector(contentEditorSelector);
          if (!contentEditor) {
            console.debug("未找到正文编辑器元素");
            return;
          }

          contentEditor.focus();

          const contentPasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
          });
          contentPasteEvent.clipboardData.setData("text/plain", ${JSON.stringify(content)});
          contentEditor.dispatchEvent(contentPasteEvent);

          // 处理媒体上传（图片）
          const images = ${JSON.stringify(images)};
          if (images && images.length > 0) {
            const imageData = [];
            for (const file of images) {
              const response = await fetch(file.url);
              const blob = await response.blob();
              const imageFile = new File([blob], file.name, { type: file.type });
              console.log("文件: " + imageFile.name + " " + imageFile.type + " " + imageFile.size);
              imageData.push(imageFile);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));

            window.postMessage({ type: "XIAOHEIHE_IMAGE_UPLOAD", images: imageData }, "*");
          }

          console.log('小黑盒内容填写完成');
        } catch (error) {
          console.error("小黑盒发布过程中出错:", error);
        }
      })()
    `
  }

  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const content = data.content || ''

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

        async function uploadVideo(file) {
          const fileInput = await waitForElement('input[type=file][accept*="video"]');
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('视频上传事件已触发');
        }

        try {
          const video = ${JSON.stringify(data.video)};
          if (video) {
            const response = await fetch(video.url);
            const blob = await response.blob();
            const videoFile = new File([blob], video.name, { type: video.type });
            console.log('视频文件: ' + videoFile.name + ' ' + videoFile.type + ' ' + videoFile.size);
            await uploadVideo(videoFile);
            console.log('视频上传已初始化');
          }

          await new Promise(resolve => setTimeout(resolve, 5000));

          // 填写标题
          const titleEditor = document.querySelector('div.hb-cpt__editor-title .ProseMirror.hb-editor');
          if (titleEditor) {
            titleEditor.focus();
            const titlePasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer(),
            });
            titlePasteEvent.clipboardData.setData('text/plain', ${JSON.stringify(title)});
            titleEditor.dispatchEvent(titlePasteEvent);
          }

          // 填写描述
          const contentEditor = document.querySelector('div.video__edit-content .ProseMirror.hb-editor');
          if (contentEditor) {
            contentEditor.focus();
            const contentPasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer(),
            });
            contentPasteEvent.clipboardData.setData('text/plain', ${JSON.stringify(content)});
            contentEditor.dispatchEvent(contentPasteEvent);
          }

          console.log('视频内容填写完成');
        } catch (error) {
          console.error('小黑盒视频发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.xiaoheihe.cn'
    })
    // 小黑盒使用 pkey 或 heybox_id cookie 判断登录状态
    return cookies.some((c) => c.name === 'pkey' || c.name === 'heybox_id')
  }

  async getUserInfo(
    view: BrowserView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('xiaoheihe.cn')) {
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
            const nameEl = document.querySelector('.user-name, .nickname, .header-user-name');
            const avatarEl = document.querySelector('.user-avatar img, .avatar img, .header-avatar img');
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
      ? PLATFORM_PUBLISH_URLS.xiaoheihe[contentType] || PLATFORM_PUBLISH_URLS.xiaoheihe.DYNAMIC
      : PLATFORM_PUBLISH_URLS.xiaoheihe.DYNAMIC

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('xiaoheihe.cn/creator')) {
      await view.webContents.loadURL(url || 'https://www.xiaoheihe.cn/creator/editor/draft/image_text')
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
          // 等待一段时间确保文件上传完成
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // 查找发布按钮
          const publishButton = document.querySelector("button.editor-publish__btn");

          console.debug("sendButton", publishButton);

          if (publishButton) {
            // 如果找到发布按钮，检查是否可点击
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
              attempts++;
              console.debug("Waiting for send button to be enabled. Attempt " + attempts + "/10");
            }

            if (publishButton.disabled) {
              console.debug("Send button is still disabled after 10 attempts");
              return { clicked: false, error: '发布按钮仍然不可用' };
            }

            console.debug("sendButton clicked");
            // 点击发布按钮
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
