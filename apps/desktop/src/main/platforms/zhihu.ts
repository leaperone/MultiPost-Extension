import type { BrowserView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  VideoData,
  ArticleData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Zhihu platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO, ARTICLE
 */
export class ZhihuAdapter extends BasePlatformAdapter {
  readonly platform = 'zhihu' as const
  readonly name = '知乎'
  readonly publishUrl = 'https://www.zhihu.com'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC', 'VIDEO', 'ARTICLE']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
      case 'VIDEO':
        return this.getVideoFillScript(data as VideoData)
      case 'ARTICLE':
        return this.getArticleFillScript(data as ArticleData)
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
          await waitForElement('input');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 查找并点击"写想法"或"发想法"按钮
          const buttons = document.querySelectorAll('button');
          const postButton = Array.from(buttons).find(
            el => el.textContent?.includes('写想法') || el.textContent?.includes('发想法')
          );

          if (!postButton) {
            console.debug('未找到"写想法"元素');
            return;
          }

          postButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 等待并填写标题
          await waitForElement('textarea[placeholder="添加标题(选填)"]');
          const titleInput = document.querySelector('textarea[placeholder="添加标题(选填)"]');
          if (titleInput && ${JSON.stringify(title)}) {
            titleInput.value = ${JSON.stringify(title)};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 查找编辑器并填写内容
          const editorElement = document.querySelector('div[data-contents="true"]');
          if (!editorElement) {
            console.debug('未找到编辑器元素');
            return;
          }

          editorElement.focus();
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData?.setData('text/plain', ${JSON.stringify(content)});
          editorElement.dispatchEvent(pasteEvent);
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 处理图片上传
          const images = ${JSON.stringify(images)};
          if (images && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
              const image = images[i];
              if (i >= 9) {
                console.debug('Zhihu 最多支持 9 张，跳过');
                break;
              }
              console.debug('try upload file', image);
              const response = await fetch(image.url);
              const arrayBuffer = await response.arrayBuffer();
              const file = new File([arrayBuffer], image.name, { type: image.type });

              const imagePasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer()
              });
              imagePasteEvent.clipboardData?.items.add(file);
              editorElement.dispatchEvent(imagePasteEvent);
            }
          }

          editorElement.dispatchEvent(new Event('input', { bubbles: true }));
          editorElement.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 3000));

          // 等待图片上传完成
          let loadingCount = 0;
          while (loadingCount < 30) {
            const uploadingImages = document.querySelectorAll('div.DraggableTags-tag-drag img');
            if (uploadingImages.length === 0) break;

            const loadingImg = Array.from(uploadingImages).find(img => img.src.startsWith('blob'));
            if (!loadingImg) break;

            await new Promise(resolve => setTimeout(resolve, 2000));
            loadingCount++;
          }

          console.log('成功填入知乎内容和图片');
        } catch (error) {
          console.error('填入知乎内容或上传图片时出错:', error);
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

        async function uploadVideo(file) {
          const fileInput = await waitForElement('input[type=file]');
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('视频上传事件已触发');
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
          const titleInput = await waitForElement('input[placeholder="输入视频标题"]');
          if (titleInput) {
            titleInput.value = ${JSON.stringify(title)} || ${JSON.stringify(content.slice(0, 20))};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 填写内容
          const contentEditor = await waitForElement('textarea[placeholder="填写视频简介，让更多人找到你的视频"]');
          if (contentEditor) {
            contentEditor.value = ${JSON.stringify(content)};
            contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
            contentEditor.dispatchEvent(new Event('change', { bubbles: true }));
            contentEditor.focus();
            contentEditor.blur();
          }

          console.log('视频内容填写完成');
        } catch (error) {
          console.error('知乎视频发布过程中出错:', error);
        }
      })()
    `
  }

  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const htmlContent = data.htmlContent || ''

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
          // 等待标题输入框出现
          const titleTextarea = await waitForElement('textarea[placeholder="请输入标题（最多 100 个字）"]');
          if (!titleTextarea) {
            console.debug('未找到标题输入框');
            return;
          }

          // 设置标题
          titleTextarea.value = ${JSON.stringify(title.slice(0, 100))};
          titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));

          // 等待编辑器加载
          const editor = await waitForElement('div[data-contents="true"]');
          if (!editor) {
            console.debug('未找到编辑器元素');
            return;
          }

          // 处理并填充内容
          editor.focus();
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/html', ${JSON.stringify(htmlContent)});
          editor.dispatchEvent(pasteEvent);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));

          await new Promise(resolve => setTimeout(resolve, 5000));

          // 上传封面图片
          const cover = ${JSON.stringify(data.cover)};
          if (cover) {
            const fileInput = document.querySelector('input[type="file"].UploadPicture-input');
            if (fileInput) {
              const dataTransfer = new DataTransfer();
              const response = await fetch(cover.url);
              const arrayBuffer = await response.arrayBuffer();
              const file = new File([arrayBuffer], cover.name, { type: cover.type });
              dataTransfer.items.add(file);
              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              fileInput.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }

          console.log('文章内容填写完成');
        } catch (error) {
          console.error('发布文章失败:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.zhihu.com'
    })
    return cookies.some((c) => c.name === 'z_c0')
  }

  async getUserInfo(
    view: BrowserView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('zhihu.com')) {
        await view.webContents.loadURL(this.publishUrl)
        await this.waitForNavigation(view)
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
            const avatar = document.querySelector('img.Avatar')?.src;
            const nameEl = document.querySelector('.AppHeader-profile .Popover-content');
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
      ? PLATFORM_PUBLISH_URLS.zhihu[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('zhihu.com')) {
      await view.webContents.loadURL(url)
      await this.waitForNavigation(view)
    }
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
      await this.sleep(10000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const buttons = document.querySelectorAll('button');
          const sendButton = Array.from(buttons).find(
            button => button.textContent?.includes('发布')
          );

          if (sendButton) {
            sendButton.click();
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
