import type { WebContentsView } from 'electron'
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
 * Baijiahao platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO, ARTICLE
 */
export class BaijiahaoAdapter extends BasePlatformAdapter {
  readonly platform = 'baijiahao' as const
  readonly name = '百家号'
  readonly publishUrl = 'https://baijiahao.baidu.com'
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
          // 等待编辑器出现并输入内容
          await waitForElement('textarea#content');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 更新编辑器内容
          const editor = document.querySelector('textarea#content');
          if (editor) {
            const combinedContent = ${JSON.stringify(title)} ? ${JSON.stringify(title + '\n\n' + content)} : ${JSON.stringify(content)};
            editor.value = combinedContent;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
            editor.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 处理图片上传
          const images = ${JSON.stringify(images)};
          if (images.length > 0) {
            const uploadButton = document.querySelector('div.uploader-plus');
            if (uploadButton) {
              uploadButton.dispatchEvent(new Event('click', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 1000));

              // 切换到本地图片标签
              const tabs = document.querySelectorAll('div.cheetah-tabs-tab-btn');
              const localImageTab = Array.from(tabs).find(tab => tab.textContent?.includes('本地图片'));

              if (localImageTab) {
                localImageTab.dispatchEvent(new Event('click', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 1000));
              }

              // 处理文件上传
              const fileInput = document.querySelector('input[type="file"][accept="image/*"]');
              if (!fileInput) {
                console.debug('未找到文件输入元素');
                return;
              }

              const dataTransfer = new DataTransfer();

              for (const image of images) {
                if (!image.type.startsWith('image/')) {
                  continue;
                }

                const response = await fetch(image.url);
                const arrayBuffer = await response.arrayBuffer();
                const file = new File([arrayBuffer], image.name, { type: image.type });
                dataTransfer.items.add(file);
              }

              if (dataTransfer.files.length > 0) {
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                fileInput.dispatchEvent(new Event('input', { bubbles: true }));
              }

              // 等待上传完成
              await new Promise(resolve => setTimeout(resolve, 5000));

              // 点击确认按钮
              const confirmButtons = document.querySelectorAll('button.cheetah-public');
              const confirmButton = Array.from(confirmButtons).find(button => button.textContent?.includes('确认'));

              if (confirmButton) {
                confirmButton.dispatchEvent(new Event('click', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('百家号动态内容填写完成');
        } catch (error) {
          console.error('百家号发布过程中出错:', error);
        }
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

        async function uploadVideo(file) {
          const fileInput = await waitForElement('input[type="file"]');
          await new Promise(resolve => setTimeout(resolve, 3000));

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('文件上传操作完成');
        }

        async function waitForUploadCompletion(timeout = 600000) {
          return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
              const spans = document.querySelectorAll('span');
              const uploadCompleteElement = Array.from(spans).find(span => span.textContent?.includes('上传完成'));
              if (uploadCompleteElement) {
                clearInterval(checkInterval);
                console.log('视频上传完成');
                resolve();
              }
            }, 1000);

            setTimeout(() => {
              clearInterval(checkInterval);
              reject(new Error('视频上传超时'));
            }, timeout);
          });
        }

        try {
          const video = ${JSON.stringify(data.video)};

          if (!video) {
            console.error('没有视频文件');
            return;
          }

          // 处理视频上传
          const response = await fetch(video.url);
          const arrayBuffer = await response.arrayBuffer();
          const videoFile = new File([arrayBuffer], ${JSON.stringify(title)} || 'video' + '.' + video.name.split('.').pop(), {
            type: video.type
          });

          await uploadVideo(videoFile);
          await waitForUploadCompletion();

          await new Promise(resolve => setTimeout(resolve, 2000));

          // 处理标题输入
          const titleInput = document.querySelector('textarea[placeholder="请输入标题"]');
          if (titleInput) {
            titleInput.value = ${JSON.stringify(title)};
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 处理描述输入
          const descriptionInput = document.querySelector('textarea[placeholder="让别人更懂你"]');
          if (descriptionInput) {
            const description = (${JSON.stringify(content)} || ${JSON.stringify(title)}).slice(0, 100);
            descriptionInput.value = description;
            descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 处理标签输入
          const tagInput = document.querySelector('input[placeholder="获得精准推荐"]');
          const tags = ${JSON.stringify(tags)};
          if (tagInput && tags) {
            for (const tag of tags) {
              tagInput.value = tag;
              const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13
              });
              tagInput.dispatchEvent(enterEvent);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // 处理封面上传
          const cover = ${JSON.stringify(data.cover)};
          if (cover) {
            const coverUploadContainer = document.querySelector(
              'div.cheetah-upload span.cheetah-upload div.cheetah-spin-container'
            );
            if (coverUploadContainer) {
              const coverUploadButton = coverUploadContainer.firstChild;
              if (coverUploadButton) {
                coverUploadButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const fileInput = document.querySelector("div.cheetah-tabs-content input[name='media']");
                if (fileInput && cover.type?.includes('image/')) {
                  const coverResponse = await fetch(cover.url);
                  const coverBuffer = await coverResponse.arrayBuffer();
                  const coverFile = new File([coverBuffer], cover.name, { type: cover.type });

                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(coverFile);
                  fileInput.files = dataTransfer.files;
                  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                  fileInput.dispatchEvent(new Event('input', { bubbles: true }));

                  await new Promise(resolve => setTimeout(resolve, 3000));

                  const doneButton = Array.from(document.querySelectorAll('button')).find(e => e.textContent === '确定');
                  if (doneButton) {
                    doneButton.click();
                  }
                }
              }
            }
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('百家号视频内容填写完成');
        } catch (error) {
          console.error('百家号视频发布过程中出错:', error);
        }
      })()
    `
  }

  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const htmlContent = data.htmlContent || ''

    return `
      (async function() {
        // 百家号文章使用 API 发布方式
        // 显示同步提示
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
            正在同步文章到百度百家号...
          </div>
        \`;
        shadow.appendChild(tip);

        function getEditToken() {
          const token = localStorage.getItem('edit-token')?.replace(/"/g, '');
          return token || '';
        }

        async function uploadSingleImage(fileInfo) {
          try {
            const blob = await (await fetch(fileInfo.url)).blob();
            const file = new File([blob], fileInfo.name, { type: fileInfo.type });

            const formData = new FormData();
            formData.append('org_file_name', fileInfo.name);
            formData.append('type', 'image');
            formData.append('app_id', '');
            formData.append('is_waterlog', '1');
            formData.append('save_material', '1');
            formData.append('no_compress', '0');
            formData.append('is_events', '');
            formData.append('article_type', 'news');
            formData.append('media', file);

            const response = await fetch('https://baijiahao.baidu.com/materialui/picture/uploadProxy', {
              method: 'POST',
              body: formData,
              credentials: 'include',
              headers: { 'Token': getEditToken() }
            });

            if (!response.ok) throw new Error('上传失败: ' + response.status);

            const result = await response.json();
            if (result?.ret?.https_url) {
              return result.ret.https_url;
            }
            return null;
          } catch (error) {
            console.error('上传图片失败:', error);
            return null;
          }
        }

        try {
          const articleData = ${JSON.stringify({ title, htmlContent, cover: data.cover, images: data.images, digest: data.digest })};

          // 处理内容中的图片
          let processedContent = articleData.htmlContent;
          if (articleData.images && articleData.images.length > 0) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(articleData.htmlContent, 'text/html');
            const images = Array.from(doc.getElementsByTagName('img'));

            for (const img of images) {
              const src = img.getAttribute('src');
              if (!src) continue;

              const fileInfo = articleData.images.find(f => f.url === src);
              if (!fileInfo) continue;

              const newUrl = await uploadSingleImage(fileInfo);
              if (newUrl) {
                img.setAttribute('src', newUrl);
              }
            }
            processedContent = doc.body.innerHTML;
          }

          // 发布文章
          const formData = new FormData();
          formData.append('type', 'news');
          formData.append('title', articleData.title?.slice(0, 30) || '');
          formData.append('content', processedContent);
          formData.append('abstract', articleData.digest || '');
          formData.append('source', 'upload');
          formData.append('cover_source', 'upload');

          const response = await fetch('https://baijiahao.baidu.com/pcui/article/save?callback=bjhdraft', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: { 'Token': getEditToken() }
          });

          const result = await response.json();
          if (result.errno === 0) {
            const floatTip = tip.querySelector('.float-tip');
            floatTip.textContent = '文章同步成功！';
            setTimeout(() => document.body.removeChild(host), 3000);

            if (result.ret?.id) {
              window.location.href = 'https://baijiahao.baidu.com/builder/rc/edit?type=news&article_id=' + result.ret.id;
            }
          } else {
            throw new Error(result.message || '发布失败');
          }
        } catch (error) {
          const floatTip = tip.querySelector('.float-tip');
          floatTip.textContent = '同步失败，请重试';
          floatTip.style.backgroundColor = '#dc2626';
          setTimeout(() => document.body.removeChild(host), 3000);
          console.error('发布文章失败:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.baidu.com'
    })
    return cookies.some((c) => c.name === 'BDUSS')
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

  async navigateToPublishPage(view: WebContentsView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.baijiahao[contentType] || this.publishUrl
      : this.publishUrl

    await view.webContents.loadURL(url)
    await this.waitForNavigation(view)
  }

  async fillContent(
    view: WebContentsView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void> {
    await this.executeScript(view, this.getFillScript(contentType, data))
  }

  async submit(view: WebContentsView, contentType?: SyncContentType): Promise<PublishResult> {
    try {
      await this.sleep(5000)

      // 文章类型使用 API 直接发布，不需要点击按钮
      if (contentType === 'ARTICLE') {
        return { success: true }
      }

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const publishButton = document.querySelector('button.events-op-bar-pub-btn-blue');
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
