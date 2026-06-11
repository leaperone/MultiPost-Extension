import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, DynamicData } from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * LinkedIn platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class LinkedinAdapter extends BasePlatformAdapter {
  readonly platform = 'linkedin' as const
  readonly name = 'LinkedIn'
  readonly publishUrl = 'https://www.linkedin.com'
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
        console.log('LinkedIn 函数被调用');

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
          // 等待页面加载并点击发帖触发按钮
          await waitForElement('div.share-box-feed-entry__top-bar');
          await new Promise(resolve => setTimeout(resolve, 500));

          const triggerButton = document.querySelector('div.share-box-feed-entry__top-bar > button');
          if (!triggerButton) {
            console.debug('未找到触发按钮');
            return;
          }
          triggerButton.click();

          // 等待编辑器出现
          await waitForElement('div.ql-editor[contenteditable="true"]');
          await new Promise(resolve => setTimeout(resolve, 500));

          // 查找正确的编辑器
          const editor =
            document.querySelector('div.ql-editor[contenteditable="true"][data-placeholder="What do you want to talk about?"]') ||
            document.querySelector('div.ql-editor[contenteditable="true"][data-placeholder="您想讨论什么话题？"]') ||
            document.querySelector('div.ql-editor[contenteditable="true"][data-placeholder="分享您的意见想法⋯⋯"]');

          if (!editor) {
            console.debug('未找到编辑器元素');
            return;
          }

          // 处理内容输入
          editor.focus();
          const textContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
          editor.innerText = textContent;
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));

          await new Promise(resolve => setTimeout(resolve, 500));

          // 处理图片和视频上传（LinkedIn 最多支持 8 个）
          const mediaFiles = [...${JSON.stringify(images)}, ...${JSON.stringify(videos)}];
          if (mediaFiles.length > 0) {
            const dataTransfer = new DataTransfer();

            for (let i = 0; i < mediaFiles.length; i++) {
              if (i >= 8) {
                console.debug('LinkedIn 最多支持 8 个文件，跳过');
                break;
              }
              const fileData = mediaFiles[i];
              try {
                const response = await fetch(fileData.url);
                const arrayBuffer = await response.arrayBuffer();
                const file = new File([arrayBuffer], fileData.name, { type: fileData.type });
                dataTransfer.items.add(file);
              } catch (error) {
                console.error('获取文件失败:', error);
              }
            }

            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dataTransfer
            });
            editor.dispatchEvent(pasteEvent);
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('LinkedIn 内容填写完成');
        } catch (error) {
          console.error('LinkedIn 发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.linkedin.com'
    })
    return cookies.some((c) => c.name === 'li_at' || c.name === 'JSESSIONID')
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
            const avatar = document.querySelector('.global-nav__me-photo')?.src;
            return { username: 'linkedin_user', displayName: 'LinkedIn User', avatar: avatar || '' };
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
    await view.webContents.loadURL(this.publishUrl + '/feed/')
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

          const sendButton = document.querySelector('button.share-actions__primary-action');
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
