import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  VideoData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * Bluesky platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 */
export class BlueskyAdapter extends BasePlatformAdapter {
  readonly platform = 'bluesky' as const
  readonly name = 'Bluesky'
  readonly publishUrl = 'https://bsky.app'
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
          await new Promise(resolve => setTimeout(resolve, 3000));

          const newPostButton = document.querySelector('button[data-testid="composeFAB"]');
          if (newPostButton) {
            newPostButton.click();
          } else {
            console.log('未找到撰写新帖文按钮');
            return;
          }

          // 处理输入
          const contentInput = await waitForElement('div[contenteditable="true"]');
          contentInput.focus();
          contentInput.textContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
          contentInput.dispatchEvent(new Event('input', { bubbles: true }));
          contentInput.dispatchEvent(new Event('change', { bubbles: true }));

          const images = ${JSON.stringify(images)};
          if (images.length > 0) {
            const imageData = [];
            for (const file of images) {
              const response = await fetch(file.url);
              const blob = await response.blob();
              const imageFile = new File([blob], file.name, { type: file.type });
              imageData.push(imageFile);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));

            window.postMessage({ type: 'BLUESKY_IMAGE_UPLOAD', images: imageData }, '*');
          }

          console.log('Bluesky 内容填写完成');
        } catch (error) {
          console.error('Bluesky 发布过程中出错:', error);
        }
      })()
    `
  }

  private getVideoFillScript(data: VideoData): string {
    const content = data.content || ''
    const title = data.title || ''

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
          await new Promise(resolve => setTimeout(resolve, 3000));

          const newPostButton = document.querySelector('button[data-testid="composeFAB"]');
          if (newPostButton) {
            newPostButton.click();
          } else {
            console.log('未找到撰写新帖文按钮');
            return;
          }

          // 处理输入
          const contentInput = await waitForElement('div[contenteditable="true"]');
          contentInput.focus();
          contentInput.textContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
          contentInput.dispatchEvent(new Event('input', { bubbles: true }));
          contentInput.dispatchEvent(new Event('change', { bubbles: true }));

          // 视频上传需要通过文件输入
          const video = ${JSON.stringify(data.video)};
          if (video) {
            const fileInput = document.querySelector('input[type="file"][accept*="video"]');
            if (fileInput) {
              const response = await fetch(video.url);
              const blob = await response.blob();
              const videoFile = new File([blob], video.name, { type: video.type });

              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(videoFile);
              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          console.log('Bluesky 视频内容填写完成');
        } catch (error) {
          console.error('Bluesky 视频发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.bsky.app'
    })
    return cookies.length > 0
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
            return { username: 'bluesky_user', displayName: 'Bluesky User', avatar: '' };
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
          const maxAttempts = 3;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const publishButton = document.querySelector('button[aria-label="Publish post"]:not(:disabled)');
            if (publishButton) {
              publishButton.click();
              await new Promise(resolve => setTimeout(resolve, 3000));
              return { clicked: true };
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
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
