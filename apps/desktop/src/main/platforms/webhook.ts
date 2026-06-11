import type { WebContentsView } from 'electron'
import type { PublishResult, SyncContentType, SyncContentData, DynamicData } from '../../shared/types'
import { BasePlatformAdapter } from './base'

/**
 * Webhook platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 * Note: This adapter sends content to configured webhook URLs
 */
export class WebhookAdapter extends BasePlatformAdapter {
  readonly platform = 'webhook' as const
  readonly name = 'Webhook'
  readonly publishUrl = 'about:blank'
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
        // 创建浮动提示
        const host = document.createElement('div');
        const tip = document.createElement('div');

        host.style.position = 'fixed';
        host.style.bottom = '20px';
        host.style.right = '20px';
        host.style.zIndex = '9999';
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });

        tip.innerHTML = \`
          <style>
            .float-tip {
              background: #1e293b;
              color: white;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          </style>
          <div class="float-tip">
            Webhook 内容准备就绪
          </div>
        \`;
        shadow.appendChild(tip);

        const textContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
        console.log('Webhook 内容:', textContent);

        setTimeout(() => {
          document.body.removeChild(host);
        }, 3000);
      })()
    `
  }

  async checkLoginStatus(_view: WebContentsView): Promise<boolean> {
    // Webhook 不需要登录
    return true
  }

  async getUserInfo(
    _view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    return { username: 'webhook', displayName: 'Webhook', avatar: '' }
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

  // Webhook 的实际发送通过 IPC 在主进程中处理
  async submit(_view: WebContentsView, _contentType?: SyncContentType): Promise<PublishResult> {
    // Webhook 发送逻辑应该在主进程中通过 IPC 处理
    // 这里只返回成功，实际发送由调用方处理
    return { success: true }
  }

  // 发送到 webhook URL 的辅助方法
  async sendToWebhook(url: string, content: string): Promise<boolean> {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    let messageBody: Record<string, unknown>

    if (hostname === 'qyapi.weixin.qq.com' || hostname === 'oapi.dingtalk.com') {
      messageBody = {
        msgtype: 'text',
        text: {
          content: content
        }
      }
    } else {
      messageBody = {
        msg_type: 'text',
        content: {
          text: content
        }
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Webhook 发送失败:', error)
      return false
    }
  }
}
