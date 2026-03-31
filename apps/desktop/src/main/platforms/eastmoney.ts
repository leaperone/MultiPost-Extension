import type { BrowserView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, VideoData } from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Eastmoney (东方财富) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: VIDEO, ARTICLE
 */
export class EastmoneyAdapter extends BasePlatformAdapter {
  readonly platform = 'eastmoney' as const
  readonly name = '东方财富'
  readonly publishUrl = 'https://www.eastmoney.com'
  readonly supportedContentTypes: SyncContentType[] = ['VIDEO', 'ARTICLE']

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

        async function uploadVideo(file) {
          const fileInput = await waitForElement('input[id="uploadVideo"]');

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Video upload event triggered');
        }

        try {
          const video = ${JSON.stringify(data.video)};
          const videoTitle = ${JSON.stringify(title)};
          const videoContent = ${JSON.stringify(content)};
          const contentToInsert = videoTitle ? videoTitle + '\\n' + videoContent : videoContent;

          // Handle video upload
          if (video) {
            const response = await fetch(video.url);
            const blob = await response.blob();
            const videoFile = new File([blob], video.name, { type: video.type });
            console.log('Video file:', videoFile.name, videoFile.type, videoFile.size);

            await uploadVideo(videoFile);
            console.log('Video upload initialized');
          } else {
            console.error('No video file');
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 5000));

          // Wait for description editor and input content
          const editor = await waitForElement('textarea[id="videoArtTitle"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          editor.textContent = contentToInsert;

          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/plain', contentToInsert);
          editor.dispatchEvent(pasteEvent);

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('Eastmoney video content fill completed');
        } catch (error) {
          console.error('Eastmoney video publish error:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.eastmoney.com'
    })
    return cookies.some((c) => c.name === 'em_hq_fls' || c.name === 'em_userid')
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
      ? PLATFORM_PUBLISH_URLS.eastmoney[contentType] || this.publishUrl
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

          const spanElements = document.querySelectorAll('span');
          const submitButtonSpan = Array.from(spanElements).find(el => el.textContent === '发布');

          if (submitButtonSpan) {
            submitButtonSpan.parentElement?.click();
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
