import type { BrowserView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, VideoData } from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Chejiahao (车家号) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: VIDEO
 */
export class ChejiahaoAdapter extends BasePlatformAdapter {
  readonly platform = 'chejiahao' as const
  readonly name = '车家号'
  readonly publishUrl = 'https://creator.autohome.com.cn'
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
          const titleInput = document.querySelector('input[placeholder*="标题"]');
          if (titleInput) {
            titleInput.value = title;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Title filled');
          } else {
            console.error('Title input not found');
          }
        }

        async function fillDescription(content) {
          const descInput = document.querySelector('textarea[placeholder*="描述"], textarea[placeholder*="简介"]');
          if (descInput) {
            descInput.value = content;
            descInput.dispatchEvent(new Event('input', { bubbles: true }));
            descInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Description filled');
          } else {
            console.error('Description input not found');
          }
        }

        async function uploadVideo(video) {
          const fileInput = document.querySelector('input[type="file"][accept*="video"]');
          if (!fileInput) {
            console.error('Video file input not found');
            return;
          }

          const response = await fetch(video.url);
          const arrayBuffer = await response.arrayBuffer();
          const videoFile = new File([arrayBuffer], video.name, { type: video.type });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(videoFile);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Video upload event triggered');
        }

        try {
          const video = ${JSON.stringify(data.video)};
          const videoTitle = ${JSON.stringify(title)};
          const videoContent = ${JSON.stringify(content)};

          // Upload video first
          if (video) {
            await uploadVideo(video);
            console.log('Video upload initialized');
          } else {
            console.error('No video file');
            return;
          }

          // Wait for upload to start
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Fill title
          if (videoTitle) {
            await fillTitle(videoTitle);
          }

          // Fill description
          if (videoContent) {
            await fillDescription(videoContent);
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('Chejiahao video content fill completed');
        } catch (error) {
          console.error('Chejiahao video publish error:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.autohome.com.cn'
    })
    return cookies.some((c) => c.name === 'autoid' || c.name === 'AH_U')
  }

  async getUserInfo(
    view: BrowserView
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

  async navigateToPublishPage(view: BrowserView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.chejiahao[contentType] || this.publishUrl
      : this.publishUrl

    await view.webContents.loadURL(url)
    await this.waitForNavigation(view)
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
