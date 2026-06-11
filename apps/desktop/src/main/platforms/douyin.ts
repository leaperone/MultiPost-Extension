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
 * Douyin (抖音) platform adapter
 * Ported from MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 */
export class DouyinAdapter extends BasePlatformAdapter {
  readonly platform = 'douyin' as const
  readonly name = '抖音'
  readonly publishUrl = 'https://creator.douyin.com'
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
          const images = ${JSON.stringify(images)};
          const title = ${JSON.stringify(title)};
          const content = ${JSON.stringify(content)};

          if (!images || images.length === 0) {
            console.log('发布图文需要至少提供一张图片');
            // 如果没有图片，尝试填写内容到通用编辑器
            const editor = await waitForElement('[contenteditable="true"]');
            if (editor) {
              editor.focus();
              const fullContent = title ? title + '\\n' + content : content;
              const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
              });
              pasteEvent.clipboardData.setData('text/plain', fullContent);
              editor.dispatchEvent(pasteEvent);
            }
            return;
          }

          await waitForElement('input[type="file"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 找到并点击"发布图文"标签
          const semiTabs = document.querySelector('.semi-tabs.semi-tabs-top');
          console.debug('semitabs', semiTabs);
          if (!semiTabs || !semiTabs.previousElementSibling) {
            console.error('未找到 semitabs 或其前置元素');
            return;
          }
          const tabsDiv = semiTabs.previousElementSibling.querySelectorAll('div');
          console.debug('tabsDiv', tabsDiv);
          const publishTab = Array.from(tabsDiv).find(e => e.textContent === '发布图文');
          console.debug('publishTab', publishTab);
          if (!publishTab) {
            console.error('未找到 publishTab');
            return;
          }
          publishTab.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 找到图片上传输入框
          const fileInput = document.querySelector(
            'input[accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp,image/tif"]'
          );
          console.debug('fileInput', fileInput);
          if (!fileInput) {
            console.error('未找到 fileInput');
            return;
          }

          // 上传图片
          const dataTransfer = new DataTransfer();
          for (const fileInfo of images) {
            console.debug('try upload file', fileInfo);
            try {
              const response = await fetch(fileInfo.url);
              if (!response.ok) throw new Error('HTTP error: ' + response.status);
              const blob = await response.blob();
              // 优先使用 fileInfo.type，其次使用 blob.type，最后根据扩展名推断
              const mimeType = fileInfo.type || blob.type || (() => {
                const ext = fileInfo.name.split('.').pop()?.toLowerCase();
                const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', bmp: 'image/bmp', gif: 'image/gif' };
                return mimeMap[ext] || 'image/jpeg';
              })();
              console.debug('使用 MIME 类型:', mimeType);
              const file = new File([blob], fileInfo.name, { type: mimeType });
              dataTransfer.items.add(file);
            } catch (error) {
              console.error('上传文件失败:', fileInfo.url, error);
            }
          }
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.debug('文件上传操作完成');

          // 等待标题输入框出现
          await waitForElement('input[placeholder="添加作品标题"]');
          const titleInput = document.querySelector('input[placeholder="添加作品标题"]');
          console.debug('titleInput', titleInput);
          if (titleInput) {
            titleInput.value = title || '';
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 填写描述
          const contentEditor = document.querySelector(
            'div.zone-container.editor-kit-container.editor.editor-comp-publish[contenteditable="true"]'
          );
          if (contentEditor) {
            console.debug('descriptionInput', contentEditor);
            contentEditor.focus();
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            pasteEvent.clipboardData.setData('text/plain', content || '');
            contentEditor.dispatchEvent(pasteEvent);
          }

          await new Promise(resolve => setTimeout(resolve, 5000));

          console.log('Dynamic content filled successfully');
        } catch (error) {
          console.error('Failed to fill dynamic content:', error);
        }
      })()
    `
  }

  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const content = data.content || ''
    const tags = data.tags || []
    const video = data.video
    const cover = data.cover

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

        async function uploadVideo(videoData) {
          const fileInput = await waitForElement('input[type=file]');

          const response = await fetch(videoData.url);
          const blob = await response.blob();
          // 优先使用 videoData.type，其次使用 blob.type，最后根据扩展名推断
          const mimeType = videoData.type || blob.type || (() => {
            const ext = videoData.name.split('.').pop()?.toLowerCase();
            const mimeMap = { mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', webm: 'video/webm' };
            return mimeMap[ext] || 'video/mp4';
          })();
          console.log('视频 MIME 类型:', mimeType);
          const videoFile = new File([blob], videoData.name, { type: mimeType });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(videoFile);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));

          console.log('视频上传事件已触发:', videoData.name);
        }

        async function uploadCover(coverData) {
          console.log('开始上传封面', coverData);
          const coverUploadContainer = await waitForElement('div.content-upload-new');
          if (!coverUploadContainer) return;

          const coverUploadButton = coverUploadContainer.firstChild?.firstChild?.firstChild;
          if (!coverUploadButton) return;

          coverUploadButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          const fileInput = await waitForElement('input[type="file"].semi-upload-hidden-input');
          if (!fileInput) return;

          const response = await fetch(coverData.url);
          const blob = await response.blob();
          // 优先使用 coverData.type，其次使用 blob.type，最后根据扩展名推断
          const mimeType = coverData.type || blob.type || (() => {
            const ext = coverData.name.split('.').pop()?.toLowerCase();
            const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', bmp: 'image/bmp', gif: 'image/gif' };
            return mimeMap[ext] || 'image/jpeg';
          })();

          if (!mimeType.includes('image/')) {
            console.log('封面文件不是图片类型:', mimeType);
            return;
          }

          console.log('封面 MIME 类型:', mimeType);
          const imageFile = new File([blob], coverData.name, { type: mimeType });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(imageFile);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));

          console.log('封面上传操作已触发');
          await new Promise(resolve => setTimeout(resolve, 3000));

          const doneButtons = document.querySelectorAll('button.semi-button.semi-button-primary.semi-button-light');
          const doneButton = Array.from(doneButtons).find(btn => btn.textContent === '完成');
          if (doneButton) {
            doneButton.click();
          }
        }

        try {
          const videoData = ${JSON.stringify(video)};
          const coverData = ${JSON.stringify(cover)};
          const title = ${JSON.stringify(title)};
          const content = ${JSON.stringify(content)};
          const tags = ${JSON.stringify(tags)};

          // 上传视频
          if (videoData && videoData.url) {
            await uploadVideo(videoData);
            console.log('视频上传已初始化');
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

          // 填写标题
          const titleInput = await waitForElement('input[placeholder*="作品标题"]');
          if (titleInput) {
            titleInput.value = title || content.slice(0, 20);
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('标题已填写:', titleInput.value);
          }

          // 填写描述和标签
          const contentEditor = await waitForElement(
            'div.zone-container.editor-kit-container.editor.editor-comp-publish[contenteditable="true"]'
          );
          if (contentEditor) {
            contentEditor.focus();
            const contentPasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            contentPasteEvent.clipboardData.setData('text/plain', content + ' ');
            contentEditor.dispatchEvent(contentPasteEvent);

            // 添加标签
            if (tags && tags.length > 0) {
              const tagsToSync = tags.slice(0, 5);
              for (const tag of tagsToSync) {
                console.log('添加标签:', tag);
                contentEditor.focus();

                const pasteEvent = new ClipboardEvent('paste', {
                  bubbles: true,
                  cancelable: true,
                  clipboardData: new DataTransfer()
                });
                pasteEvent.clipboardData.setData('text/plain', ' #' + tag);
                contentEditor.dispatchEvent(pasteEvent);

                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }

          // 上传封面
          if (coverData && coverData.url) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await uploadCover(coverData);
          }

          console.log('抖音视频内容填充完成');
        } catch (error) {
          console.error('抖音视频发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.douyin.com'
    })
    return cookies.some((c) => c.name === 'sessionid' || c.name === 'passport_csrf_token')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      return await this.executeScript<{
        username: string
        displayName?: string
        avatar?: string
      } | null>(
        view,
        `
        (function() {
          try {
            const avatarEl = document.querySelector('.avatar img, [class*="avatar"] img');
            const avatar = avatarEl?.src || '';
            const nameEl = document.querySelector('[class*="user-name"], [class*="nickname"]');
            const displayName = nameEl?.textContent?.trim() || '';

            if (displayName) {
              return { username: displayName, displayName, avatar };
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
      ? PLATFORM_PUBLISH_URLS.douyin[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('douyin.com')) {
      await view.webContents.loadURL(url)
      await this.waitForNavigation(view)
    }
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
          await new Promise(resolve => setTimeout(resolve, 2000));

          const buttons = document.querySelectorAll('button');
          const publishButton = Array.from(buttons).find(
            button => button.textContent === '发布'
          );

          if (publishButton) {
            // 等待按钮可点击
            let attempts = 0;
            while (publishButton.disabled && attempts < 30) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }

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
