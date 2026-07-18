import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, DynamicData } from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * Threads platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class ThreadsAdapter extends BasePlatformAdapter {
  readonly platform = 'threads' as const
  readonly name = 'Threads'
  readonly publishUrl = 'https://www.threads.net'
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

        function findCreateButton() {
          const labels = ['创建', '建立', 'Create', '新貼文', 'New post'];
          for (const label of labels) {
            const icon = document.querySelector('svg[aria-label="' + label + '"]');
            if (icon) return icon.closest('a, div, button');
          }
          return null;
        }

        try {
          // 优先使用多语言入口，回退到编辑区占位元素。
          const createButton = findCreateButton();
          const placeholder = createButton || await waitForElement(
            'div[aria-label="文本栏为空白。请输入内容，撰写新帖子。"], div[contenteditable="true"][aria-placeholder]'
          );
          placeholder.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          const dialog = document.querySelector("div[role='dialog']") || document.body;

          // 查找并填写帖子内容
          const editor = dialog.querySelector('div[contenteditable="true"][aria-placeholder]') ||
            dialog.querySelector('div[contenteditable="true"]') ||
            dialog.querySelector('div[aria-label="文本栏为空白。请输入内容，撰写新帖子。"]');
          if (!editor) {
            throw new Error('未找到编辑器元素');
          }
          editor.click();
          editor.focus();

          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          const tags = ${JSON.stringify(tags)};
          const tagSuffix = tags.length ? ' ' + tags.map(tag => '#' + tag).join(' ') : '';
          const textContent = ${JSON.stringify(title)}
            ? ${JSON.stringify(title)} + '\\n' + ${JSON.stringify(content)} + tagSuffix
            : ${JSON.stringify(content)} + tagSuffix;
          pasteEvent.clipboardData.setData('text/plain', textContent);
          editor.dispatchEvent(pasteEvent);

          const images = ${JSON.stringify(images)};
          const videos = ${JSON.stringify(videos)};

          if (images?.length > 0 || videos?.length > 0) {
            const fileInput = await waitForElement(
              'input[type="file"][accept="image/avif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"], input[type="file"][accept*="image/jpeg"][accept*="video/mp4"], input[type="file"][accept*="image/"][accept*="video/"]'
            );

            if (!fileInput) {
              throw new Error('未找到文件输入元素');
            }

            const dataTransfer = new DataTransfer();

            // 处理图片
            if (images) {
              for (const image of images.slice(0, 20)) {
                try {
                  const response = await fetch(image.url);
                  const blob = await response.blob();
                  const file = new File([blob], image.name, { type: image.type });
                  dataTransfer.items.add(file);
                } catch (error) {
                  console.error('获取图片失败:', error);
                }
              }
            }

            // 处理视频（只取第一个）
            if (videos && videos.length > 0 && dataTransfer.files.length < 20) {
              try {
                const video = videos[0];
                const response = await fetch(video.url);
                const blob = await response.blob();
                const file = new File([blob], video.name, { type: video.type });
                dataTransfer.items.add(file);
              } catch (error) {
                console.error('获取视频失败:', error);
              }
            }

            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('Threads 内容填写完成');
        } catch (error) {
          console.error('填入Threads内容或上传图片时出错:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.threads.net'
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
            return { username: 'threads_user', displayName: 'Threads User', avatar: '' };
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

          const dialog = document.querySelector("div[role='dialog']");
          if (!dialog) {
            return { clicked: false, error: '未找到对话框' };
          }

          const labels = ['Post', '发布', '發佈'];
          const publishDiv = Array.from(
            dialog.querySelectorAll('button, div[role="button"], div, [aria-label]')
          ).find(el => labels.includes(el.getAttribute('aria-label')?.trim() || '') ||
            labels.includes(el.textContent?.trim() || ''));
          const nextDiv = publishDiv?.querySelector('div');

          if (nextDiv || publishDiv) {
            (nextDiv || publishDiv).click();
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
