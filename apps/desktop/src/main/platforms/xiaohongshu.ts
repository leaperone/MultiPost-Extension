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
 * Xiaohongshu (RedNote) platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 */
export class XiaohongshuAdapter extends BasePlatformAdapter {
  readonly platform = 'xiaohongshu' as const
  readonly name = '小红书'
  readonly publishUrl = 'https://creator.xiaohongshu.com/publish/publish'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC', 'VIDEO']

  /**
   * Get JavaScript code to fill content into Xiaohongshu publish form
   */
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

  /**
   * Dynamic content fill script
   */
  private getDynamicFillScript(data: DynamicData): string {
    const content = data.content || ''
    const title = data.title || content.slice(0, 20)
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

        async function uploadImages(images) {
          const fileInput = await waitForElement('input[type="file"]');
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
              const file = new File([blob], fileInfo.name, { type: fileInfo.type || blob.type });
              dataTransfer.items.add(file);
              console.log('准备上传图片:', fileInfo.name, file.type, file.size);
            } catch (error) {
              console.error('上传图片失败:', fileInfo.url, error);
            }
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('文件上传操作完成');
          }
        }

        try {
          const images = ${JSON.stringify(images)};
          const title = ${JSON.stringify(title)};
          const content = ${JSON.stringify(content)};

          if (images && images.length > 0) {
            // 等待页面加载
            await waitForElement('span[class="title"]');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 点击上传图文按钮
            const uploadButtons = document.querySelectorAll('span[class="title"]');
            const uploadButton = Array.from(uploadButtons).find(
              element => element.textContent?.includes('上传图文')
            );

            if (!uploadButton) {
              console.error('未找到上传图文按钮');
              return;
            }

            uploadButton.click();
            uploadButton.dispatchEvent(new Event('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 上传文件
            await uploadImages(images);
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 填写标题
            const titleInput = await waitForElement('input[type="text"]');
            if (titleInput) {
              const titleText = title || content?.slice(0, 20) || '';
              titleInput.value = titleText;
              titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // 填写内容
            const contentEditor = await waitForElement('div[contenteditable="true"]');
            if (contentEditor) {
              contentEditor.focus();
              const contentPasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
              });
              contentPasteEvent.clipboardData.setData('text/plain', content || '');
              contentEditor.dispatchEvent(contentPasteEvent);
              await new Promise(resolve => setTimeout(resolve, 1000));
              contentEditor.blur();
              console.log('设置内容:', content);
            }
          } else {
            // 没有图片时的处理
            const titleInput = await waitForElement('input[type="text"]');
            if (titleInput) {
              titleInput.value = title;
              titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const contentEditor = await waitForElement('div[contenteditable="true"]');
            if (contentEditor) {
              contentEditor.focus();
              const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
              });
              pasteEvent.clipboardData.setData('text/plain', content);
              contentEditor.dispatchEvent(pasteEvent);
              await new Promise(resolve => setTimeout(resolve, 1000));
              contentEditor.blur();
            }
          }

          console.log('Dynamic content filled successfully');
        } catch (error) {
          console.error('Failed to fill dynamic content:', error);
        }
      })()
    `
  }

  /**
   * Video content fill script with file upload support
   * Ported from MultiPost-Extension
   */
  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const description = data.content || ''
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
          const fileInput = await waitForElement('input[type="file"]');
          if (!fileInput) {
            console.error('未找到文件输入元素');
            return;
          }

          const dataTransfer = new DataTransfer();
          try {
            const response = await fetch(videoData.url);
            if (!response.ok) {
              throw new Error('HTTP 错误! 状态: ' + response.status);
            }
            const blob = await response.blob();
            const file = new File([blob], videoData.name, { type: videoData.type });
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
            console.log('文件上传操作完成');
          }
        }

        async function uploadCover(coverData) {
          console.log('尝试上传封面', coverData);
          const coverUploadTrigger = document.querySelector('div.noCover.uploadCover');
          if (!coverUploadTrigger) {
            console.error('未找到封面上传触发器');
            return;
          }
          coverUploadTrigger.click();

          const fileInputSelector = "input[accept='image/png, image/jpeg, image/*']";
          try {
            await waitForElement(fileInputSelector);
          } catch (e) {
            console.error('等待封面上传元素超时');
            return;
          }

          const fileInput = document.querySelector(fileInputSelector);
          if (!fileInput) {
            console.error('未找到封面上传的文件输入元素');
            return;
          }

          const dataTransfer = new DataTransfer();
          if (!coverData.type.includes('image/')) {
            console.error('封面文件不是图片');
            return;
          }

          try {
            const response = await fetch(coverData.url);
            const arrayBuffer = await response.arrayBuffer();
            const file = new File([arrayBuffer], coverData.name, { type: coverData.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error('上传封面失败:', error);
            return;
          }

          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('封面上传操作触发');
          await new Promise(resolve => setTimeout(resolve, 3000));

          const doneButtons = document.querySelectorAll('span');
          const doneButton = Array.from(doneButtons).find(btn => btn.textContent?.trim() === '确定');
          if (doneButton) {
            doneButton.click();
          }
        }

        try {
          const videoData = ${JSON.stringify(video)};
          const coverData = ${JSON.stringify(cover)};
          const title = ${JSON.stringify(title)};
          const content = ${JSON.stringify(description)};
          const tags = ${JSON.stringify(tags)};

          // 等待页面加载
          await waitForElement('span[class="title"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 上传视频
          if (videoData && videoData.url) {
            await uploadVideo(videoData);
          }

          // 等待标题输入框出现
          await waitForElement('input[type="text"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 填写标题
          const titleInput = document.querySelector('input[type="text"]');
          if (titleInput) {
            const finalTitle = title?.slice(0, 20) || content?.slice(0, 20) || '';
            titleInput.value = finalTitle;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 填写内容和标签
          const editor = document.querySelector('div[contenteditable="true"]');
          if (!editor) {
            console.error('未找到编辑器元素');
            return;
          }

          // 填写正文内容
          editor.focus();
          const contentPasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          contentPasteEvent.clipboardData.setData('text/plain', content + '\\n');
          editor.dispatchEvent(contentPasteEvent);
          await new Promise(resolve => setTimeout(resolve, 1000));
          editor.blur();

          // 添加标签
          if (tags && tags.length > 0) {
            for (const tag of tags) {
              editor.focus();
              const tagPasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
              });
              tagPasteEvent.clipboardData.setData('text/plain', '#' + tag);
              editor.dispatchEvent(tagPasteEvent);
              await new Promise(resolve => setTimeout(resolve, 2000));

              // 模拟回车键
              const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13
              });
              editor.dispatchEvent(enterEvent);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }

          // 上传封面
          if (coverData && coverData.url) {
            await uploadCover(coverData);
          }

          console.log('小红书视频内容填充完成');
        } catch (error) {
          console.error('小红书视频发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.xiaohongshu.com'
    })
    return cookies.some((c) => c.name === 'web_session')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('creator.xiaohongshu.com')) {
        await view.webContents.loadURL('https://creator.xiaohongshu.com')
        await this.waitForNavigation(view)
        await this.sleep(2000)
      }

      return await this.executeScript<{
        username: string
        displayName: string
        avatar: string
      } | null>(
        view,
        `
        (function() {
          try {
            const avatar = document.querySelector('.user-avatar img')?.src || '';
            const nameEl = document.querySelector('.user-name') || document.querySelector('.nickname');
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
      ? PLATFORM_PUBLISH_URLS.xiaohongshu[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('creator.xiaohongshu.com/publish')) {
      await view.webContents.loadURL(url)
      await this.waitForNavigation(view)
      await this.sleep(2000)
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
      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const buttons = document.querySelectorAll('button');
          const publishButton = Array.from(buttons).find(
            button => button.textContent?.includes('发布')
          );

          if (publishButton) {
            // Wait for button to be enabled by polling aria-disabled attribute
            let attempts = 0;
            while (publishButton.getAttribute('aria-disabled') === 'true' && attempts < 30) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }

            if (publishButton.getAttribute('aria-disabled') === 'true') {
              return { clicked: false, error: 'Publish button is still disabled after 30s' };
            }

            publishButton.click();
            await new Promise(resolve => setTimeout(resolve, 10000));
            return { clicked: true };
          }

          return { clicked: false, error: 'Publish button not found' };
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
