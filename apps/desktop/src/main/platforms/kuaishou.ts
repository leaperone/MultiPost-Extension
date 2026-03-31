import type { BrowserView } from 'electron'
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
 * Kuaishou platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO
 */
export class KuaishouAdapter extends BasePlatformAdapter {
  readonly platform = 'kuaishou' as const
  readonly name = '快手'
  readonly publishUrl = 'https://cp.kuaishou.com'
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

        function simulateDragAndDrop(element, dataTransfer) {
          const dragenterEvent = new DragEvent('dragenter', { bubbles: true });
          const dragoverEvent = new DragEvent('dragover', { bubbles: true });
          const dropEvent = new DragEvent('drop', { bubbles: true, dataTransfer: dataTransfer });

          element.dispatchEvent(dragenterEvent);
          element.dispatchEvent(dragoverEvent);
          element.dispatchEvent(dropEvent);
        }

        const images = ${JSON.stringify(images)};

        // 检查图片数量
        if (!images || images.length === 0) {
          console.log('发布图文，请至少提供一张图片');
          return;
        }

        // 等待文件输入元素
        await waitForElement('input[type="file"]');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 查找并点击上传图片的tab
        const uploadTab = document.querySelector('div#rc-tabs-0-tab-2');
        if (!uploadTab) {
          console.error('未找到 uploadTab');
          return;
        }
        uploadTab.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 创建 DataTransfer 对象并添加文件
        const dataTransfer = new DataTransfer();
        for (const fileInfo of images) {
          console.log('try upload file', fileInfo);
          try {
            const response = await fetch(fileInfo.url);
            const arrayBuffer = await response.arrayBuffer();
            const file = new File([arrayBuffer], fileInfo.name, { type: fileInfo.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error('上传图片失败:', fileInfo.url, error);
          }
        }

        // 查找上传图片按钮
        const buttons = document.querySelectorAll('button');
        const uploadButton = Array.from(buttons).find(button => button.textContent === '上传图片');

        if (!uploadButton) {
          console.error("未找到'上传图片'按钮");
          return;
        }

        // 执行拖拽上传
        const dropTarget = uploadButton.parentElement?.parentElement;
        simulateDragAndDrop(dropTarget, dataTransfer);
        console.log('文件上传操作完成');

        // 等待描述输入框出现
        await waitForElement('div[placeholder="添加合适的话题和描述，作品能获得更多推荐～"][contenteditable="true"]');

        // 查找描述输入框并粘贴内容
        const descriptionInput = document.querySelector(
          'div[placeholder="添加合适的话题和描述，作品能获得更多推荐～"][contenteditable="true"]'
        );

        if (descriptionInput) {
          descriptionInput.focus();
          const textContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n' + content)} : ${JSON.stringify(content)};
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData?.setData('text/plain', textContent);
          descriptionInput.dispatchEvent(pasteEvent);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('快手图文内容填写完成');
      })()
    `
  }

  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const content = data.content || ''
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

        async function uploadVideo() {
          await waitForElement('input[type="file"]');
          await new Promise(resolve => setTimeout(resolve, 1000));

          const video = ${JSON.stringify(data.video)};
          if (!video) {
            console.error('没有视频文件');
            return;
          }

          const fileInput = document.querySelector('input[type="file"]');
          if (!fileInput) {
            console.error('未找到文件输入元素');
            return;
          }

          try {
            const response = await fetch(video.url);
            const buffer = await response.arrayBuffer();
            const file = new File([buffer], video.name, { type: video.type });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('文件上传操作完成');
          } catch (error) {
            console.error('上传视频失败:', error);
          }
        }

        async function uploadCover() {
          const cover = ${JSON.stringify(data.cover)};
          if (!cover) return;

          const coverSettingsSpan = Array.from(document.querySelectorAll('span')).find(el =>
            el.textContent?.includes('封面设置')
          );

          if (!coverSettingsSpan) {
            console.error('未找到 "封面设置" 按钮');
            return;
          }

          const coverUploadButton = coverSettingsSpan.parentElement?.nextElementSibling?.firstChild?.firstChild;
          if (!coverUploadButton) {
            console.error('未找到封面上传区域');
            return;
          }

          coverUploadButton.click();

          try {
            await waitForElement('div.ant-modal-body');
          } catch (error) {
            console.error('封面设置弹窗未出现', error);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 3000));

          while (true) {
            const loadingSpan = Array.from(document.querySelectorAll('div.ant-modal-body span')).find(
              el => el.textContent === '加载中'
            );
            if (loadingSpan) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              break;
            }
          }

          const uploadCoverDiv = Array.from(document.querySelectorAll('div.ant-modal-body div')).find(
            el => el.textContent === '上传封面'
          );

          if (!uploadCoverDiv) {
            console.error('未找到 "上传封面" 按钮');
            return;
          }
          uploadCoverDiv.click();

          const fileInput = await waitForElement("div.ant-modal-body input[type='file']");
          if (!fileInput) {
            console.error('未找到封面上传的 file input');
            return;
          }

          const dataTransfer = new DataTransfer();
          if (cover.type?.includes('image/')) {
            try {
              const response = await fetch(cover.url);
              const buffer = await response.arrayBuffer();
              const file = new File([buffer], cover.name, { type: cover.type });
              dataTransfer.items.add(file);
            } catch (error) {
              console.error('上传封面失败:', error);
            }
          }

          if (dataTransfer.files.length === 0) {
            console.error('没有要上传的封面文件');
            return;
          }

          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));

          await new Promise(resolve => setTimeout(resolve, 3000));

          const confirmButton = Array.from(document.querySelectorAll('button')).find(
            el => el.textContent?.trim() === '确认'
          );

          if (confirmButton) {
            confirmButton.click();
          }
        }

        // 上传视频
        await uploadVideo();

        // 填写内容
        const contentEditor = await waitForElement('div[contenteditable="true"]');
        if (contentEditor) {
          const limitedTags = ${JSON.stringify(tags)}.slice(0, 4);
          const formattedContent = ${JSON.stringify(title + '\n' + content)} + '\\n' + limitedTags.map(tag => '#' + tag).join(' ');

          contentEditor.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          contentEditor.focus();

          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData?.setData('text/plain', formattedContent);
          contentEditor.dispatchEvent(pasteEvent);
          await new Promise(resolve => setTimeout(resolve, 1000));
          contentEditor.blur();
        }

        // 上传封面
        const cover = ${JSON.stringify(data.cover)};
        if (cover) {
          await uploadCover();
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('快手视频内容填写完成');
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.kuaishou.com'
    })
    return cookies.some((c) => c.name === 'userId' || c.name === 'kuaishou.web.cp.api_st')
  }

  async getUserInfo(
    view: BrowserView
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
            const avatar = document.querySelector('.user-avatar img')?.src;
            const nameEl = document.querySelector('.user-name');
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
      ? PLATFORM_PUBLISH_URLS.kuaishou[contentType] || this.publishUrl
      : this.publishUrl

    await view.webContents.loadURL(url)
    await this.waitForNavigation(view)
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
      await this.sleep(5000)

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const divElements = document.querySelectorAll('div');
          const publishButton = Array.from(divElements).find(el => el.textContent === '发布');

          if (publishButton) {
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
