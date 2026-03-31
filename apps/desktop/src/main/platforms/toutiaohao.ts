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
 * Toutiaohao (Toutiao Creator) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 */
export class ToutiaohaoAdapter extends BasePlatformAdapter {
  readonly platform = 'toutiaohao' as const
  readonly name = '头条号'
  readonly publishUrl = 'https://mp.toutiao.com'
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
          // 等待编辑器出现并输入内容
          await waitForElement('div[contenteditable="true"]');
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const editor = document.querySelector('div[contenteditable="true"]');
          console.debug("qlEditor", editor);
          if (!editor) {
            console.debug("未找到编辑器元素");
            return;
          }

          editor.innerText = ${JSON.stringify(content)};
          editor.focus();
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // 移除已存在的图片
          const removeExistingImages = async () => {
            for (let i = 0; i < 20; i++) {
              const closeButton = document.querySelector(".image-remove-btn");
              if (!closeButton) break;
              console.debug("Clicking close button", closeButton);
              closeButton.click();
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          };

          await removeExistingImages();

          // 处理图片上传
          const images = ${JSON.stringify(images)};
          if (images && images.length > 0) {
            const uploadButtons = document.querySelectorAll("button.syl-toolbar-button");
            const uploadButton = Array.from(uploadButtons).find((button) => button.textContent?.includes("图片"));

            if (uploadButton) {
              console.debug("Found upload image button", uploadButton);
              uploadButton.dispatchEvent(new Event("click", { bubbles: true }));
              await new Promise((resolve) => setTimeout(resolve, 3000));

              const fileInput = document.querySelector('input[type="file"]');
              console.debug("fileInput", fileInput);

              if (!fileInput) {
                console.debug("未找到文件输入元素");
                return;
              }

              const dataTransfer = new DataTransfer();
              for (const image of images) {
                if (!image.type.startsWith("image/")) {
                  console.debug("skip non-image file", image);
                  continue;
                }
                console.debug("try upload file", image);
                const response = await fetch(image.url);
                const arrayBuffer = await response.arrayBuffer();
                const file = new File([arrayBuffer], image.name, { type: image.type });
                dataTransfer.items.add(file);
                console.debug("uploaded");
              }

              if (dataTransfer.files.length > 0) {
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event("change", { bubbles: true }));
                fileInput.dispatchEvent(new Event("input", { bubbles: true }));
                console.debug("文件上传操作完成");
              }

              await new Promise((resolve) => setTimeout(resolve, 5000));

              const confirmButton = document.querySelector('button[data-e2e="imageUploadConfirm-btn"]');
              console.debug("confirmButton", confirmButton);
              if (confirmButton) {
                console.debug("Clicking confirm button for image upload");
                confirmButton.dispatchEvent(new Event("click", { bubbles: true }));
                await new Promise((resolve) => setTimeout(resolve, 2000));
              } else {
                console.debug("未找到图片上传确认按钮");
              }
            }
          }

          console.log('头条号动态内容填写完成');
        } catch (error) {
          console.error("头条号发布过程中出错:", error);
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
          const fileInput = await waitForElement('input[type=file]');
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
          const titleInput = await waitForElement('input[placeholder*="标题"]');
          if (titleInput) {
            titleInput.value = ${JSON.stringify(title)} || ${JSON.stringify(content.slice(0, 30))};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 填写简介/描述
          const descInput = document.querySelector('textarea[placeholder*="简介"], textarea[placeholder*="描述"]');
          if (descInput) {
            descInput.value = ${JSON.stringify(content)};
            descInput.dispatchEvent(new Event('input', { bubbles: true }));
            descInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          console.log('视频内容填写完成');
        } catch (error) {
          console.error('头条号视频发布过程中出错:', error);
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
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('toutiao.com')) {
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
            const nameEl = document.querySelector('.author-name, .user-name, .nickname');
            const avatarEl = document.querySelector('.avatar img, .user-avatar img');
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
      ? PLATFORM_PUBLISH_URLS.toutiaohao[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('toutiao.com')) {
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

          const publishButton = document.querySelector("button.publish-content");
          console.debug("sendButton", publishButton);

          if (publishButton) {
            console.debug("sendButton clicked");
            publishButton.dispatchEvent(new Event("click", { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          // 尝试其他发布按钮
          const buttons = document.querySelectorAll('button');
          const sendButton = Array.from(buttons).find(
            button => button.textContent?.includes('发布')
          );

          if (sendButton) {
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
