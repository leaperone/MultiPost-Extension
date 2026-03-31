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
 * WeixinChannel platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 * Note: Uses wujie micro-frontend framework with Shadow DOM
 */
export class WeixinChannelAdapter extends BasePlatformAdapter {
  readonly platform = 'weixinchannel' as const
  readonly name = '微信视频号'
  readonly publishUrl = 'https://channels.weixin.qq.com'
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

  private getWaitForElementScript(): string {
    return `
      function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
          function findElementInRoot(root) {
            const element = root.querySelector(selector);
            if (element) return element;

            const allElements = root.querySelectorAll('*');
            for (const el of allElements) {
              if (el.shadowRoot) {
                const found = findElementInRoot(el.shadowRoot);
                if (found) return found;
              }
            }
            return null;
          }

          function findInWujieApp() {
            const wujieApp = document.querySelector('wujie-app');
            if (wujieApp?.shadowRoot) {
              const element = wujieApp.shadowRoot.querySelector(selector);
              if (element) return element;
              return findElementInRoot(wujieApp.shadowRoot);
            }
            return findElementInRoot(document);
          }

          const element = findInWujieApp();
          if (element) { resolve(element); return; }

          const observer = new MutationObserver(() => {
            const element = findInWujieApp();
            if (element) { resolve(element); observer.disconnect(); }
          });

          observer.observe(document.body, { childList: true, subtree: true });

          const checkWujieApp = () => {
            const wujieApp = document.querySelector('wujie-app');
            if (wujieApp?.shadowRoot) {
              const shadowObserver = new MutationObserver(() => {
                const element = wujieApp.shadowRoot.querySelector(selector);
                if (element) {
                  resolve(element);
                  observer.disconnect();
                  shadowObserver.disconnect();
                }
              });
              shadowObserver.observe(wujieApp.shadowRoot, { childList: true, subtree: true });
              setTimeout(() => shadowObserver.disconnect(), timeout);
            }
          };

          checkWujieApp();

          const intervalCheck = setInterval(() => {
            const element = findInWujieApp();
            if (element) {
              resolve(element);
              observer.disconnect();
              clearInterval(intervalCheck);
            }
          }, 1000);

          setTimeout(() => {
            observer.disconnect();
            clearInterval(intervalCheck);
            reject(new Error('Element not found: ' + selector));
          }, timeout);
        });
      }
    `
  }

  private getDynamicFillScript(data: DynamicData): string {
    const content = data.content || ''
    const title = data.title || ''
    const images = data.images || []

    return `
      (async function() {
        ${this.getWaitForElementScript()}

        async function uploadImages(images) {
          const fileInput = await waitForElement('input[type="file"][accept="image/*"]');

          const files = await Promise.all(
            images.map(async (image) => {
              const response = await fetch(image.url);
              const blob = await response.blob();
              const file = new File([blob], image.name, { type: image.type });
              console.log('图片文件准备就绪: ' + file.name + ' ' + file.type + ' ' + file.size);
              return file;
            })
          );

          const dataTransfer = new DataTransfer();
          for (const file of files) {
            dataTransfer.items.add(file);
          }

          fileInput.focus();
          await new Promise(resolve => setTimeout(resolve, 200));

          fileInput.files = dataTransfer.files;

          const events = [
            new Event('focus', { bubbles: true }),
            new Event('change', { bubbles: true, cancelable: true }),
            new Event('input', { bubbles: true, cancelable: true }),
            new Event('blur', { bubbles: true })
          ];

          for (const event of events) {
            fileInput.dispatchEvent(event);
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          console.log('所有图片上传事件已触发');
        }

        try {
          const images = ${JSON.stringify(images)};

          await new Promise(resolve => setTimeout(resolve, 2000));

          if (images && images.length > 0) {
            await uploadImages(images);
          }

          await new Promise(resolve => setTimeout(resolve, 5000));

          // 处理内容输入
          const editorElement = await waitForElement('div.input-editor');
          if (editorElement) {
            editorElement.innerHTML = '';
            editorElement.focus();
            await new Promise(resolve => setTimeout(resolve, 300));

            editorElement.innerHTML = ${JSON.stringify(content)};

            const events = [
              new Event('focus', { bubbles: true }),
              new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: new DataTransfer() }),
              new Event('input', { bubbles: true, cancelable: true }),
              new Event('change', { bubbles: true, cancelable: true }),
              new Event('keyup', { bubbles: true }),
              new Event('blur', { bubbles: true })
            ];

            events[1].clipboardData?.setData('text/plain', ${JSON.stringify(content)});

            for (const event of events) {
              editorElement.dispatchEvent(event);
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          const titleInput = await waitForElement('input[placeholder="填写标题, 22个字符内"]');

          titleInput.focus();
          await new Promise(resolve => setTimeout(resolve, 200));

          titleInput.value = '';
          await new Promise(resolve => setTimeout(resolve, 100));

          titleInput.value = ${JSON.stringify(title)};

          const titleEvents = [
            new Event('focus', { bubbles: true }),
            new Event('input', { bubbles: true, cancelable: true }),
            new Event('change', { bubbles: true, cancelable: true }),
            new Event('keyup', { bubbles: true }),
            new Event('blur', { bubbles: true })
          ];

          for (const event of titleEvents) {
            titleInput.dispatchEvent(event);
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('微信视频号动态内容填写完成');
        } catch (error) {
          console.error('WeiXinChannel Dynamic 发布过程中出错:', error);
        }
      })()
    `
  }

  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const content = data.content || ''
    const tags = data.tags || []

    return `
      (async function() {
        ${this.getWaitForElementScript()}

        async function uploadVideo(file) {
          const fileInput = await waitForElement('input[type="file"]');

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));

          console.log('视频上传事件已触发');
        }

        async function uploadCover(cover) {
          try {
            const coverUploadButton = await waitForElement('div.video-cover div.tag-inner');
            if (!coverUploadButton) return;

            while (coverUploadButton.parentElement?.classList.contains('disabled')) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            }

            coverUploadButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));

            const wujieApp = document.querySelector('wujie-app');
            const root = wujieApp?.shadowRoot || document;

            const fileInput = root.querySelector("div.crop-area input[type='file']");
            if (!fileInput) {
              console.error('封面上传文件输入框未找到');
              return;
            }

            const dataTransfer = new DataTransfer();
            if (cover.type?.includes('image/')) {
              const response = await fetch(cover.url);
              const arrayBuffer = await response.arrayBuffer();
              const imageFile = new File([arrayBuffer], cover.name, { type: cover.type });
              dataTransfer.items.add(imageFile);
            }

            if (dataTransfer.files.length === 0) return;

            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));

            await new Promise(resolve => setTimeout(resolve, 2000));

            const h3s = root.querySelectorAll('h3');
            const cropTitle = Array.from(h3s).find(h => h.textContent === '裁剪封面图');

            if (cropTitle) {
              const doneButtons = root.querySelectorAll('div.finder-dialog-footer button');
              const doneButton = Array.from(doneButtons).find(b => b.textContent === '确定');
              if (doneButton) {
                doneButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }

            const finalConfirmButtons = root.querySelectorAll('div.finder-dialog-footer button');
            const confirmButton = Array.from(finalConfirmButtons).find(b => b.textContent === '确认');
            if (confirmButton) {
              confirmButton.click();
            }
          } catch (error) {
            console.error('uploadCover failed:', error);
          }
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

          // 处理标题输入
          const titleInput = await waitForElement('input[placeholder="概括视频主要内容，字数建议6-16个字符"]');
          titleInput.value = ${JSON.stringify(title)};
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));

          // 处理内容和标签输入
          const descriptionInput = await waitForElement('div[data-placeholder="添加描述"]');
          if (descriptionInput) {
            descriptionInput.focus();
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            pasteEvent.clipboardData.setData('text/plain', ${JSON.stringify(content)});
            descriptionInput.dispatchEvent(pasteEvent);

            await new Promise(resolve => setTimeout(resolve, 500));

            // 添加标签
            const tags = ${JSON.stringify(tags)};
            for (const tag of tags) {
              descriptionInput.focus();
              const tagPasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
              });
              tagPasteEvent.clipboardData.setData('text/plain', ' #' + tag);
              descriptionInput.dispatchEvent(tagPasteEvent);

              await new Promise(resolve => setTimeout(resolve, 1000));

              const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13
              });
              descriptionInput.dispatchEvent(enterEvent);

              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          const cover = ${JSON.stringify(data.cover)};
          if (cover) {
            await uploadCover(cover);
          }

          // 处理原创声明
          const originalInput = await waitForElement('input[type="checkbox"][class="ant-checkbox-input"]');
          if (originalInput) {
            originalInput.click();
            await new Promise(resolve => setTimeout(resolve, 1000));

            const wujieApp = document.querySelector('wujie-app');
            let declareInput = null;

            if (wujieApp?.shadowRoot) {
              declareInput = wujieApp.shadowRoot.querySelector(
                'div.declare-body-wrapper input[type="checkbox"][class="ant-checkbox-input"]'
              );
            }

            if (declareInput) {
              declareInput.click();
              await new Promise(resolve => setTimeout(resolve, 1000));

              const buttons = wujieApp?.shadowRoot?.querySelectorAll('button[type="button"]') ||
                document.querySelectorAll('button[type="button"]');

              for (const button of Array.from(buttons)) {
                if (button.textContent === '声明原创') {
                  button.click();
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  break;
                }
              }
            }
          }

          console.log('微信视频号视频内容填写完成');
        } catch (error) {
          console.error('WeiXinVideo 发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.qq.com'
    })
    return cookies.some((c) => c.name === 'uin' || c.name === 'skey')
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
            const wujieApp = document.querySelector('wujie-app');
            const root = wujieApp?.shadowRoot || document;
            const avatar = root.querySelector('.user-avatar img')?.src;
            const nameEl = root.querySelector('.user-name');
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
      ? PLATFORM_PUBLISH_URLS.weixinchannel[contentType] || this.publishUrl
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

          const wujieApp = document.querySelector('wujie-app');
          let publishButton = null;

          if (wujieApp?.shadowRoot) {
            const buttons = wujieApp.shadowRoot.querySelectorAll('button');
            publishButton = Array.from(buttons).find(b => b.textContent?.trim() === '发表');
          }

          if (!publishButton) {
            const buttons = document.querySelectorAll('button');
            publishButton = Array.from(buttons).find(b => b.textContent?.trim() === '发表');
          }

          if (publishButton) {
            publishButton.focus();
            await new Promise(resolve => setTimeout(resolve, 200));

            const mouseEvents = [
              new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
              new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
              new MouseEvent('click', { bubbles: true, cancelable: true })
            ];

            for (const event of mouseEvents) {
              publishButton.dispatchEvent(event);
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            return { clicked: true };
          }

          return { clicked: false, error: '未找到发表按钮' };
        })()
      `
      )

      if (!result.clicked) {
        return { success: false, error: result.error || '未找到发表按钮' }
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
