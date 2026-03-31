import type { BrowserView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, VideoData } from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * TikTok platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: VIDEO
 */
export class TiktokAdapter extends BasePlatformAdapter {
  readonly platform = 'tiktok' as const
  readonly name = 'TikTok'
  readonly publishUrl = 'https://www.tiktok.com/tiktokstudio'
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
    const tags = data.tags || []

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
          const fileInput = await waitForElement('input[type="file"][accept="video/*"]');
          if (!fileInput) {
            console.error('Video file input not found');
            throw new Error('Video file input not found');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Video upload events triggered');
        }

        async function uploadCover(cover) {
          console.log('Preparing to upload cover:', cover);

          const editContainer = await waitForElement('div.edit-container');
          if (!editContainer) {
            console.log('Cover edit container not found');
            return;
          }
          editContainer.click();
          await new Promise(r => setTimeout(r, 1000));

          const tabs = document.querySelectorAll('div.cover-edit-header div.cover-edit-tab');
          if (tabs.length < 2) {
            console.log('Cover upload tab not found');
            return;
          }
          tabs[1].click();
          await new Promise(r => setTimeout(r, 1000));

          const fileInput = await waitForElement('input[type="file"][accept="image/png, image/jpeg, image/jpg"]');
          if (!fileInput) {
            console.log('Cover image file input not found');
            return;
          }

          const response = await fetch(cover.url);
          const buffer = await response.arrayBuffer();
          const imageFile = new File([buffer], cover.name, { type: cover.type });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(imageFile);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));

          console.log('Cover image upload events triggered');
          await new Promise(r => setTimeout(r, 3000));

          const doneButtons = document.querySelectorAll('div.cover-edit-footer button');
          const doneButton = doneButtons[doneButtons.length - 1];
          if (doneButton) {
            doneButton.click();
            console.log('Done button clicked');
          }
        }

        try {
          const video = ${JSON.stringify(data.video)};
          const cover = ${JSON.stringify(data.cover)};
          const videoTitle = ${JSON.stringify(title)};
          const videoContent = ${JSON.stringify(content)};
          const tags = ${JSON.stringify(tags)};

          // Handle video upload
          if (video) {
            const response = await fetch(video.url);
            const arrayBuffer = await response.arrayBuffer();
            const extension = video.name.split('.').pop();
            const fileName = (videoTitle || 'video') + '.' + extension;
            const videoFile = new File([arrayBuffer], fileName, { type: video.type });
            console.log('Video file:', videoFile.name, videoFile.type, videoFile.size);

            await uploadVideo(videoFile);
            console.log('Video upload initialized');
          }

          await new Promise(resolve => setTimeout(resolve, 5000));

          // Handle content input
          const editor = await waitForElement('div.public-DraftEditor-content[contenteditable="true"]');
          if (editor) {
            const fullContent = videoTitle + '\\n' + videoContent + '\\n' + tags.map(tag => '#' + tag).join(' ');

            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });

            pasteEvent.clipboardData.setData('text/plain', fullContent);
            editor.dispatchEvent(pasteEvent);

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Upload cover if provided
          if (cover) {
            await uploadCover(cover);
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('TikTok video content fill completed');
        } catch (error) {
          console.error('TikTok video publish error:', error);
          throw error;
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.tiktok.com'
    })
    return cookies.some((c) => c.name === 'sessionid' || c.name === 'sid_tt')
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
            const avatar = document.querySelector('.avatar img')?.src;
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
      ? PLATFORM_PUBLISH_URLS.tiktok[contentType] || this.publishUrl
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
          for (const button of Array.from(buttons)) {
            if (['發佈', '发布', 'Post'].includes(button.textContent?.trim() || '')) {
              button.click();
              await new Promise(resolve => setTimeout(resolve, 3000));
              return { clicked: true };
            }
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
