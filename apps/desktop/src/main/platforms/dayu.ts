import type { BrowserView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, VideoData } from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Dayu (大鱼号) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: VIDEO
 * Features: cover upload (horizontal/vertical), tags, video source selection
 */
export class DayuAdapter extends BasePlatformAdapter {
  readonly platform = 'dayu' as const
  readonly name = '大鱼号'
  readonly publishUrl = 'https://mp.dayu.com'
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

        async function uploadHorizontalCover(cover) {
          if (!cover) return;

          console.log('Uploading horizontal cover...');
          const coverInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
          if (coverInputs.length > 0) {
            const coverInput = coverInputs[0];

            const response = await fetch(cover.url);
            const arrayBuffer = await response.arrayBuffer();
            const coverFile = new File([arrayBuffer], cover.name, { type: cover.type });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(coverFile);
            coverInput.files = dataTransfer.files;

            coverInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Horizontal cover upload triggered');

            // Handle crop dialog if appears
            await new Promise(resolve => setTimeout(resolve, 2000));
            const confirmButtons = document.querySelectorAll('button');
            const confirmButton = Array.from(confirmButtons).find(el => el.textContent?.includes('确定'));
            if (confirmButton) {
              confirmButton.click();
              console.log('Cover crop confirmed');
            }
          }
        }

        async function uploadVerticalCover(cover) {
          if (!cover) return;

          console.log('Uploading vertical cover...');
          const coverInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
          if (coverInputs.length > 1) {
            const coverInput = coverInputs[1];

            const response = await fetch(cover.url);
            const arrayBuffer = await response.arrayBuffer();
            const coverFile = new File([arrayBuffer], cover.name, { type: cover.type });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(coverFile);
            coverInput.files = dataTransfer.files;

            coverInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Vertical cover upload triggered');

            // Handle crop dialog if appears
            await new Promise(resolve => setTimeout(resolve, 2000));
            const confirmButtons = document.querySelectorAll('button');
            const confirmButton = Array.from(confirmButtons).find(el => el.textContent?.includes('确定'));
            if (confirmButton) {
              confirmButton.click();
              console.log('Cover crop confirmed');
            }
          }
        }

        async function fillTags(tags) {
          if (!tags || tags.length === 0) return;

          // Dayu uses Vue.js multi-input pattern for tags
          for (const tag of tags.slice(0, 5)) {
            const tagInput = document.querySelector('input[placeholder*="标签"]');
            if (tagInput) {
              tagInput.value = tag;
              tagInput.dispatchEvent(new Event('input', { bubbles: true }));
              tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          console.log('Tags filled');
        }

        async function selectVideoSource() {
          // Select "无需标注" (no annotation required) option
          const radioLabels = document.querySelectorAll('label');
          const noAnnotationLabel = Array.from(radioLabels).find(el => el.textContent?.includes('无需标注'));
          if (noAnnotationLabel) {
            noAnnotationLabel.click();
            console.log('Video source selected: 无需标注');
          }
        }

        try {
          const video = ${JSON.stringify(data.video)};
          const cover = ${JSON.stringify(data.cover)};
          const verticalCover = ${JSON.stringify(data.verticalCover)};
          const videoTitle = ${JSON.stringify(title)};
          const videoContent = ${JSON.stringify(content)};
          const tags = ${JSON.stringify(tags)};

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

          // Upload covers
          if (cover) {
            await uploadHorizontalCover(cover);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          if (verticalCover) {
            await uploadVerticalCover(verticalCover);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Fill tags
          if (tags.length > 0) {
            await fillTags(tags);
          }

          // Select video source
          await selectVideoSource();

          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('Dayu video content fill completed');
        } catch (error) {
          console.error('Dayu video publish error:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.dayu.com'
    })
    return cookies.some((c) => c.name === 'cna' || c.name === 'login_aliyunid')
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
      ? PLATFORM_PUBLISH_URLS.dayu[contentType] || this.publishUrl
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
