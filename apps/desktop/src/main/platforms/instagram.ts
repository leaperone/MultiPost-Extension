import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, DynamicData } from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * Instagram platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class InstagramAdapter extends BasePlatformAdapter {
  readonly platform = 'instagram' as const
  readonly name = 'Instagram'
  readonly publishUrl = 'https://www.instagram.com'
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
        console.log('Instagram 函数被调用');

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

          // 查找并点击"新帖子"按钮
          const createPostButton =
            document.querySelector('svg[aria-label="新帖子"]') ||
            document.querySelector('svg[aria-label="New post"]') ||
            document.querySelector('svg[aria-label="新貼文"]');

          if (!createPostButton) {
            console.debug('未找到创建帖子按钮');
            return;
          }
          createPostButton.dispatchEvent(new Event('click', { bubbles: true }));

          await new Promise(resolve => setTimeout(resolve, 1000));

          // 查找并点击"帖子"按钮
          const postTypeButton =
            document.querySelector('svg[aria-label="帖子"]') ||
            document.querySelector('svg[aria-label="Post"]') ||
            document.querySelector('svg[aria-label="貼文"]');

          if (postTypeButton) {
            postTypeButton.dispatchEvent(new Event('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // 上传媒体文件
          const mediaFiles = [...${JSON.stringify(images)}, ...${JSON.stringify(videos)}];
          if (mediaFiles.length > 0) {
            const fileInput = await waitForElement('input[type="file"]');
            if (!fileInput) {
              console.debug('未找到文件输入元素');
              return;
            }

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

            const waitTime = ${JSON.stringify(videos)}.length ? 10000 : 5000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          // 点击"下一步"按钮（两次）
          for (let i = 0; i < 2; i++) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const buttons = document.querySelectorAll('div[role="button"][tabindex="0"]');
            const continueButton = Array.from(buttons).find(el =>
              el.textContent?.includes('继续') ||
              el.textContent?.includes('下一步') ||
              el.textContent?.includes('Next')
            );
            if (continueButton) {
              continueButton.click();
            }
          }

          // 输入帖子内容
          await new Promise(resolve => setTimeout(resolve, 3000));
          const captionEditors = document.querySelectorAll(
            'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]'
          );
          const captionEditor = Array.from(captionEditors).find(el => {
            const placeholder = el.getAttribute('aria-placeholder');
            return placeholder?.includes('输入说明文字') ||
                   placeholder?.includes('撰寫說明文字') ||
                   placeholder?.includes('Write a caption');
          });

          if (captionEditor) {
            captionEditor.focus();
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            const captionContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
            pasteEvent.clipboardData?.setData('text/plain', captionContent);
            captionEditor.dispatchEvent(pasteEvent);

            await new Promise(resolve => setTimeout(resolve, 2000));
            captionEditor.blur();
          }

          console.log('Instagram 内容填写完成');
        } catch (error) {
          console.error('InstagramDynamic 发布过程中出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.instagram.com'
    })
    return cookies.some((c) => c.name === 'sessionid' || c.name === 'ds_user_id')
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
            const avatar = document.querySelector('img[data-testid="user-avatar"]')?.src;
            return { username: 'instagram_user', displayName: 'Instagram User', avatar: avatar || '' };
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
          await new Promise(resolve => setTimeout(resolve, 2000));

          const createPostDialog =
            document.querySelector('div[aria-label="创建新帖子"][role="dialog"]') ||
            document.querySelector('div[aria-label="建立新貼文"][role="dialog"]') ||
            document.querySelector('div[aria-label="Create new post"][role="dialog"]');

          if (!createPostDialog) {
            return { clicked: false, error: '未找到创建新帖子对话框' };
          }

          const buttons = createPostDialog.querySelectorAll('div[role="button"][tabindex="0"]');
          const shareButton = Array.from(buttons).find(el =>
            el.textContent?.includes('分享') || el.textContent?.includes('Share')
          );

          if (shareButton) {
            shareButton.dispatchEvent(new Event('click', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          return { clicked: false, error: '未找到分享按钮' };
        })()
      `
      )

      if (!result.clicked) {
        return { success: false, error: result.error || '未找到分享按钮' }
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
