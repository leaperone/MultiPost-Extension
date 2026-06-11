import type { WebContentsView } from 'electron'
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
 * Okjike platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 */
export class OkjikeAdapter extends BasePlatformAdapter {
  readonly platform = 'okjike' as const
  readonly name = '即刻'
  readonly publishUrl = 'https://web.okjike.com'
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

        async function fillContent() {
          const inputElement = await waitForElement('div[contenteditable="true"][role="textbox"]');
          const fullContent = ${JSON.stringify(title + '\n' + content)};
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/plain', fullContent);
          inputElement.focus();
          inputElement.dispatchEvent(pasteEvent);
        }

        async function uploadFiles() {
          const images = ${JSON.stringify(images)};
          let fileInput = document.querySelector('input[type="file"]');

          if (!fileInput) {
            console.error('未找到文件输入元素');
            return;
          }

          const dataTransfer = new DataTransfer();

          for (const fileInfo of images) {
            try {
              const response = await fetch(fileInfo.url);
              if (!response.ok) throw new Error('HTTP 错误! 状态: ' + response.status);

              const blob = await response.blob();
              const file = new File([blob], fileInfo.name, { type: fileInfo.type });
              dataTransfer.items.add(file);
            } catch (error) {
              console.error('上传文件失败:', error);
            }
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        try {
          await fillContent();

          const images = ${JSON.stringify(images)};
          if (images && images.length > 0) {
            await uploadFiles();
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('即刻动态内容填写完成');
        } catch (error) {
          console.error('发布过程中出错:', error);
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

        async function fillContent() {
          const textarea = await waitForElement('textarea[placeholder="分享你的想法..."]');
          if (textarea) {
            const fullContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n\n' + content)} : ${JSON.stringify(content)};
            textarea.value = fullContent;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        async function uploadVideo() {
          const video = ${JSON.stringify(data.video)};
          if (!video) {
            console.error('没有视频文件');
            return;
          }

          const fileInput = document.querySelector('input[type="file"][accept="video/mp4"]');
          if (!fileInput) {
            console.error('未找到文件输入元素');
            return;
          }

          const dataTransfer = new DataTransfer();

          try {
            const response = await fetch(video.url);
            if (!response.ok) throw new Error('HTTP 错误! 状态: ' + response.status);

            const blob = await response.blob();
            const file = new File([blob], video.name, { type: video.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error('上传视频失败:', error);
            return;
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        try {
          await fillContent();
          await uploadVideo();

          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('即刻视频内容填写完成');
        } catch (error) {
          console.error('发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.okjike.com'
    })
    return cookies.some(
      (c) => c.name === 'accessToken' || c.name === 'refreshToken' || c.name === 'jike.access_token'
    )
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

  async navigateToPublishPage(view: WebContentsView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.okjike[contentType] || this.publishUrl
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
      await this.sleep(3000)

      const buttonText = contentType === 'VIDEO' ? '发布' : '发送'

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const buttons = document.querySelectorAll('button');
          const publishButton = Array.from(buttons).find(button =>
            button.textContent?.includes('${buttonText}')
          );

          if (publishButton) {
            let attempts = 0;
            while (publishButton.disabled && attempts < 10) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              attempts++;
              console.log('等待发布按钮可用... 尝试 ' + attempts + '/10');
            }

            if (publishButton.disabled) {
              return { clicked: false, error: '发布按钮在10次尝试后仍被禁用' };
            }

            console.log('点击发布按钮');
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
