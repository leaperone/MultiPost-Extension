import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * V2EX platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class V2exAdapter extends BasePlatformAdapter {
  readonly platform = 'v2ex' as const
  readonly name = 'V2EX'
  readonly publishUrl = 'https://www.v2ex.com'
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
          const titleInput = await waitForElement("#topic_title");
          if (titleInput && ${JSON.stringify(title)}) {
            titleInput.value = ${JSON.stringify(title)};
            titleInput.dispatchEvent(new Event("input", { bubbles: true }));
            console.log("标题已更新");
          }

          // 等待 CodeMirror 编辑器初始化完成
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // V2EX 使用 CodeMirror 编辑器，需要通过 postMessage 传递内容
          window.postMessage({
            type: "V2EX_DYNAMIC_UPLOAD",
            content: ${JSON.stringify(content)},
          });

          // 备用方案：尝试直接操作 textarea
          const textarea = document.querySelector('#topic_content, textarea[name="content"]');
          if (textarea) {
            textarea.value = ${JSON.stringify(content)};
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 尝试操作 CodeMirror 实例
          const cmElement = document.querySelector('.CodeMirror');
          if (cmElement && cmElement.CodeMirror) {
            cmElement.CodeMirror.setValue(${JSON.stringify(content)});
          }

          console.log('V2EX 内容填写完成');
        } catch (error) {
          console.error("V2EX发布过程中出错:", error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.v2ex.com'
    })
    // V2EX 使用 A2 cookie 判断登录状态
    return cookies.some((c) => c.name === 'A2' || c.name === 'PB3_SESSION')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('v2ex.com')) {
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
            // V2EX 顶部导航栏中的用户名
            const userLink = document.querySelector('#Top .tools a[href^="/member/"]');
            const avatarEl = document.querySelector('#Top .avatar, #Rightbar .avatar');
            const username = userLink?.textContent?.trim();
            const avatar = avatarEl?.src;
            if (username) {
              return { username, displayName: username, avatar: avatar || '' };
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
      ? PLATFORM_PUBLISH_URLS.v2ex[contentType] || PLATFORM_PUBLISH_URLS.v2ex.DYNAMIC
      : PLATFORM_PUBLISH_URLS.v2ex.DYNAMIC

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('v2ex.com/write')) {
      await view.webContents.loadURL(url || 'https://www.v2ex.com/write')
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
          await new Promise(resolve => setTimeout(resolve, 1000));

          // V2EX 发布按钮
          const publishButton = document.querySelector('button[class="super normal button"]');

          if (publishButton) {
            console.log("点击发布按钮");
            publishButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          // 尝试其他按钮选择器
          const buttons = document.querySelectorAll('button, input[type="submit"]');
          const sendButton = Array.from(buttons).find(
            button => button.textContent?.includes('发布') || button.value?.includes('发布')
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
