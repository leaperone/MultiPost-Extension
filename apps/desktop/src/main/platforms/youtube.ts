import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, VideoData } from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * YouTube platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: VIDEO
 */
export class YoutubeAdapter extends BasePlatformAdapter {
  readonly platform = 'youtube' as const
  readonly name = 'YouTube'
  readonly publishUrl = 'https://studio.youtube.com'
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

        async function uploadCover(cover) {
          console.log('Trying to upload cover', cover);

          const coverInput = await waitForElement('input#file-loader.ytcp-thumbnail-uploader', 5000);
          if (!coverInput) {
            console.error('Could not find the thumbnail uploader input.');
            return;
          }

          if (!cover.type || !cover.type.includes('image/')) {
            console.error('Cover file is not an image or type is missing.');
            return;
          }

          const response = await fetch(cover.url);
          const arrayBuffer = await response.arrayBuffer();
          const coverFile = new File([arrayBuffer], cover.name, { type: cover.type });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(coverFile);

          coverInput.files = dataTransfer.files;
          coverInput.dispatchEvent(new Event('change', { bubbles: true }));
          coverInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Cover file upload events dispatched.');
        }

        try {
          const video = ${JSON.stringify(data.video)};
          const cover = ${JSON.stringify(data.cover)};
          const videoTitle = ${JSON.stringify(title + (tags.length > 0 ? ' ' + tags.map(tag => '#' + tag).join(' ') : ''))};
          const videoContent = ${JSON.stringify(content)};

          // Wait for upload button and click
          const uploadIcon = await waitForElement('ytcp-icon-button#upload-icon');
          if (!uploadIcon) {
            console.error('Upload button not found');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          uploadIcon.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Handle video upload
          if (!video) {
            console.error('No video file');
            return;
          }

          const fileInput = document.querySelector('input[type="file"]');
          if (!fileInput) {
            console.error('File input not found');
            return;
          }

          const response = await fetch(video.url);
          const arrayBuffer = await response.arrayBuffer();
          const extension = video.name.split('.').pop();
          const fileName = videoTitle + '.' + extension;
          const videoFile = new File([arrayBuffer], fileName, { type: video.type });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(videoFile);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Video upload completed');

          // Wait for title input
          const titleArea = await waitForElement('#title-textarea');
          if (!titleArea) {
            console.error('Title textarea not found');
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 3000));

          const titleInput = titleArea.querySelector('#textbox');
          if (!titleInput) {
            console.error('Title input not found');
            return;
          }

          // Clear and set title
          titleInput.innerHTML = '';
          await new Promise(resolve => setTimeout(resolve, 1000));
          titleInput.focus();

          const titlePasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          titlePasteEvent.clipboardData.setData('text/plain', videoTitle);
          titleInput.dispatchEvent(titlePasteEvent);
          await new Promise(resolve => setTimeout(resolve, 1000));
          titleInput.blur();

          // Handle description
          const descriptionArea = document.querySelector('#description-textarea');
          if (descriptionArea) {
            const descriptionInput = descriptionArea.querySelector('#textbox');
            if (descriptionInput) {
              descriptionInput.focus();
              const descPasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
              });
              descPasteEvent.clipboardData.setData('text/plain', videoContent);
              descriptionInput.dispatchEvent(descPasteEvent);
              await new Promise(resolve => setTimeout(resolve, 1000));
              descriptionInput.blur();
            }
          }

          // Upload cover if provided
          if (cover) {
            await uploadCover(cover);
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('YouTube video content fill completed');
        } catch (error) {
          console.error('YouTube video publish error:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.youtube.com'
    })
    return cookies.some(
      (c) => c.name === 'SAPISID' || c.name === 'SID' || c.name === '__Secure-3PSID'
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
            const avatar = document.querySelector('img#avatar-btn')?.src;
            const nameEl = document.querySelector('#channel-title');
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
      ? PLATFORM_PUBLISH_URLS.youtube[contentType] || this.publishUrl
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
          const publishButton = Array.from(buttons).find(el => el.textContent === '发布');

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
