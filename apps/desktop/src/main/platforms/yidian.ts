import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, VideoData } from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Yidian (一点号) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: VIDEO
 */
export class YidianAdapter extends BasePlatformAdapter {
  readonly platform = 'yidian' as const
  readonly name = '一点号'
  readonly publishUrl = 'https://mp.yidianzixun.com'
  readonly supportedContentTypes: SyncContentType[] = ['VIDEO']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'VIDEO':
        return this.getVideoFillScript(data as VideoData)
      default:
        return `console.log('Unsupported content type: ${contentType}')`
    }
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

        async function fillTitle(title) {
          await new Promise(resolve => setTimeout(resolve, 3000));

          const titleSelectors = [
            'input[placeholder*="标题"]',
            'input[name*="title"]',
            'input[class*="title"]',
            'input[type="text"]',
            '.ant-input[type="text"]',
            '.ant-input'
          ];

          for (const selector of titleSelectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement && titleElement.offsetParent !== null) {
              console.log('Found title input:', selector);

              titleElement.focus();
              titleElement.value = title;
              titleElement.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
              titleElement.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
              titleElement.dispatchEvent(new Event('blur', { bubbles: true }));

              console.log('Title filled');
              return;
            }
          }

          console.error('Title input not found');
        }

        async function fillDescription(content) {
          const descSelectors = [
            'textarea[placeholder*="描述"]',
            'textarea[placeholder*="简介"]',
            'textarea[placeholder*="内容"]',
            'textarea[name*="content"]',
            'textarea[name*="desc"]',
            'textarea',
            '.ant-input'
          ];

          for (const selector of descSelectors) {
            const descElement = document.querySelector(selector);
            if (descElement && descElement.offsetParent !== null) {
              console.log('Found description input:', selector);

              descElement.focus();
              descElement.value = content;
              descElement.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
              descElement.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

              console.log('Description filled');
              return;
            }
          }

          console.error('Description input not found');
        }

        async function uploadVideo(video) {
          console.log('Starting video upload...');

          const response = await fetch(video.url);
          const arrayBuffer = await response.arrayBuffer();
          const extension = video.name.split('.').pop() || 'mp4';
          const fileName = video.name.replace(/\\.[^/.]+$/, '') + '.' + extension;
          const videoFile = new File([arrayBuffer], fileName, { type: 'video/mp4' });

          console.log('Video file:', videoFile.name, videoFile.size, videoFile.type);

          await new Promise(resolve => setTimeout(resolve, 5000));

          const uploadSelectors = [
            '.upload-area',
            '.video-upload',
            '[class*="upload"]',
            '[class*="video"]',
            '.ant-upload',
            '.upload-btn',
            'button[class*="upload"]',
            '.upload-container'
          ];

          let uploadArea = null;
          for (const selector of uploadSelectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              console.log('Found upload area:', selector);
              uploadArea = element;
              break;
            }
          }

          const fileInputs = document.querySelectorAll('input[type="file"]');
          console.log('Found ' + fileInputs.length + ' file inputs');

          let targetInput = null;
          fileInputs.forEach((input, index) => {
            const accept = input.getAttribute('accept') || '';
            if (accept.includes('video') || accept.includes('*') || accept === '') {
              targetInput = input;
              console.log('Selected input ' + (index + 1) + ' as target');
            }
          });

          if (targetInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(videoFile);
            targetInput.files = dataTransfer.files;

            targetInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            console.log('File set to input');
            return;
          }

          console.error('No suitable file input found');
        }

        try {
          const video = ${JSON.stringify(data.video)};
          const videoTitle = ${JSON.stringify(title)};
          const videoContent = ${JSON.stringify(content)};

          if (video) {
            await uploadVideo(video);
            console.log('Video upload initialized');
          } else {
            console.error('No video file');
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 5000));

          if (videoTitle) {
            await fillTitle(videoTitle);
          }

          if (videoContent) {
            await fillDescription(videoContent);
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('Yidian video content fill completed');
        } catch (error) {
          console.error('Yidian video publish error:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.yidianzixun.com'
    })
    return cookies.some((c) => c.name === 'JSESSIONID' || c.name === 'ydzhuge')
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
      ? PLATFORM_PUBLISH_URLS.yidian[contentType] || this.publishUrl
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

  async submit(view: WebContentsView, _contentType?: SyncContentType): Promise<PublishResult> {
    try {
      await this.sleep(5000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const buttons = document.querySelectorAll('button');
          const publishButton = Array.from(buttons).find(el => el.textContent?.includes('发布'));

          if (publishButton) {
            publishButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          return { clicked: false, error: 'Publish button not found' };
        })()
      `
      )

      if (!result.clicked) {
        return { success: false, error: result.error || 'Publish button not found' }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Publish failed'
      }
    }
  }
}
