import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, DynamicData } from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * Facebook platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class FacebookAdapter extends BasePlatformAdapter {
  readonly platform = 'facebook' as const
  readonly name = 'Facebook'
  readonly publishUrl = 'https://www.facebook.com'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
      default:
        return `console.log('Unsupported content type: ${contentType}')`
    }
  }

  private getDynamicFillScript(data: DynamicData): string {
    const content = data.content || ''
    const title = data.title || ''
    const images = data.images || []
    const videos = data.videos || []

    return `
      (async function() {
        console.log('Facebook 函数被调用');

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
          await waitForElement('body');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 查找创建帖子按钮
          const createPostButton =
            document.querySelector('div[aria-label="创建帖子"]') ||
            document.querySelector('div[aria-label="Create a post"]') ||
            document.querySelector('div[aria-label="建立貼文"]');

          if (!createPostButton) {
            console.debug('未找到创建帖子按钮');
            return;
          }

          // 查找并点击照片/视频或"在想些什么"按钮
          const spans = createPostButton.querySelectorAll('span');
          const photoButton = Array.from(spans).find(span =>
            span.textContent?.includes('照片/视频') ||
            span.textContent?.includes('Photo/video') ||
            span.textContent?.includes('相片／影片') ||
            span.textContent?.includes('在想些什么') ||
            span.textContent?.includes('在想些什麼') ||
            span.textContent?.includes("What's on your mind") ||
            span.textContent?.includes('分享你的新鲜事吧') ||
            span.textContent?.includes('分享您的新鲜事吧')
          );

          if (!photoButton) {
            console.error('未找到照片/视频按钮');
            return;
          }
          photoButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 等待编辑器出现
          await waitForElement(
            'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]'
          );

          // 查找编辑器
          const editors = document.querySelectorAll(
            'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]'
          );

          const editor = Array.from(editors).find(el => {
            const placeholder = el.getAttribute('aria-placeholder');
            return placeholder?.includes('在想些什么') ||
                   placeholder?.includes('在想些什麼') ||
                   placeholder?.includes("What's on your mind") ||
                   placeholder?.includes('分享你的新鲜事吧') ||
                   placeholder?.includes('分享您的新鲜事吧');
          });

          if (!editor) {
            console.debug('未找到编辑器元素');
            return;
          }

          // 填写内容
          editor.focus();
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          const textContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
          pasteEvent.clipboardData?.setData('text/plain', textContent);
          editor.dispatchEvent(pasteEvent);

          // 上传文件
          const mediaFiles = [...${JSON.stringify(images)}, ...${JSON.stringify(videos)}];
          if (mediaFiles.length > 0) {
            const fileInputs = document.querySelectorAll(
              'input[type="file"][accept^="image/"]'
            );

            if (fileInputs && fileInputs.length > 0) {
              const fileInput = fileInputs[fileInputs.length - 1];
              const dataTransfer = new DataTransfer();

              for (const media of mediaFiles) {
                try {
                  const response = await fetch(media.url);
                  const arrayBuffer = await response.arrayBuffer();
                  const file = new File([arrayBuffer], media.name, { type: media.type });
                  dataTransfer.items.add(file);
                } catch (error) {
                  console.error('获取文件失败:', error);
                }
              }

              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('Facebook 内容填写完成');
        } catch (error) {
          console.error('FacebookDynamic 发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.facebook.com'
    })
    return cookies.some((c) => c.name === 'c_user' || c.name === 'xs')
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
            return { username: 'facebook_user', displayName: 'Facebook User', avatar: '' };
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

  async navigateToPublishPage(view: WebContentsView, _contentType?: SyncContentType): Promise<void> {
    await view.webContents.loadURL(this.publishUrl)
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

          const sendButton =
            document.querySelector('div[aria-label="发帖"]') ||
            document.querySelector('div[aria-label="Post"]') ||
            document.querySelector('div[aria-label="發佈"]');

          if (sendButton) {
            sendButton.dispatchEvent(new Event('click', { bubbles: true }));
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
