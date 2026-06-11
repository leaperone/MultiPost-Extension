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
 * Maimai platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC
 */
export class MaimaiAdapter extends BasePlatformAdapter {
  readonly platform = 'maimai' as const
  readonly name = '脉脉'
  readonly publishUrl = 'https://maimai.cn'
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
        console.log("Maimai 函数被调用");

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
          // 等待页面加载
          await waitForElement("div[contenteditable]");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 填写标题（可选）
          const titleInput = document.querySelector("input[placeholder='输入标题会更受欢迎（选填）']");
          console.debug("titleInput", titleInput);
          if (titleInput && ${JSON.stringify(title)}) {
            titleInput.value = ${JSON.stringify(title)};
            titleInput.dispatchEvent(new Event("input", { bubbles: true }));
            titleInput.dispatchEvent(new Event("change", { bubbles: true }));
          }

          // 填写内容
          const editor = document.querySelector("div[contenteditable]");
          console.debug("qlEditor", editor);
          if (!editor) {
            console.debug("未找到编辑器元素");
            return;
          }

          const htmlContent = (${JSON.stringify(content)}).replace(/\\n/g, "<br>");
          editor.innerHTML = htmlContent;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          editor.dispatchEvent(new Event("change", { bubbles: true }));

          // 上传媒体文件
          const images = ${JSON.stringify(images)};
          const videos = ${JSON.stringify(videos)};
          const mediaFiles = [...images, ...videos];

          if (mediaFiles.length > 0) {
            // 检查是否有视频，如果有视频只上传第一个视频
            const hasVideo = mediaFiles.some((file) => file.type.startsWith("video/"));
            let filesToUpload = mediaFiles;
            if (hasVideo) {
              const videoFile = mediaFiles.find((file) => file.type.startsWith("video/"));
              if (videoFile) {
                filesToUpload = [videoFile];
              }
            }

            // 根据类型选择不同的 input
            const fileInput = document.querySelector(
              hasVideo ? 'input[type="file"][id="video"]' : 'input[type="file"][id="picture"]'
            );

            if (!fileInput) {
              console.debug("未找到文件输入元素");
              return;
            }

            const dataTransfer = new DataTransfer();
            for (let i = 0; i < filesToUpload.length; i++) {
              if (i >= 9) {
                console.debug("最多上传9张图片");
                break;
              }
              const fileData = filesToUpload[i];
              console.debug("try upload file", fileData);
              try {
                const response = await fetch(fileData.url);
                const arrayBuffer = await response.arrayBuffer();
                const file = new File([arrayBuffer], fileData.name, { type: fileData.type });
                dataTransfer.items.add(file);
                console.debug("uploaded");
              } catch (error) {
                console.error("获取文件失败:", error);
              }
            }

            if (dataTransfer.files.length > 0) {
              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event("change", { bubbles: true }));
              fileInput.dispatchEvent(new Event("input", { bubbles: true }));
              console.debug("文件上传操作完成");
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log('脉脉内容填写完成');
        } catch (error) {
          console.error("Maimai 发布过程中出错:", error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.maimai.cn'
    })
    // 脉脉使用 token 或 session cookie 判断登录状态
    return cookies.some((c) => c.name === 'token' || c.name === 'session' || c.name === 'stoken')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('maimai.cn')) {
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
            const nameEl = document.querySelector('.user-name, .nickname, .name');
            const avatarEl = document.querySelector('.user-avatar img, .avatar img');
            const displayName = nameEl?.textContent?.trim();
            const avatar = avatarEl?.src;
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

  async navigateToPublishPage(view: WebContentsView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.maimai[contentType] || PLATFORM_PUBLISH_URLS.maimai.DYNAMIC
      : PLATFORM_PUBLISH_URLS.maimai.DYNAMIC

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('maimai.cn/community')) {
      await view.webContents.loadURL(url || 'https://maimai.cn/community/home/following')
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
      await this.sleep(10000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 查找发布按钮
          const buttons = document.querySelectorAll("button");
          const sendButton = Array.from(buttons).find((btn) => btn.textContent?.includes("发动态"));
          console.debug("sendButton", sendButton);

          if (sendButton) {
            console.debug("自动发布：点击发布按钮");
            sendButton.dispatchEvent(new Event("click", { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          return { clicked: false, error: '未找到发送按钮' };
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
