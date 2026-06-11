import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  ArticleData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Jianshu platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: ARTICLE
 */
export class JianshuAdapter extends BasePlatformAdapter {
  readonly platform = 'jianshu' as const
  readonly name = '简书'
  readonly publishUrl = 'https://www.jianshu.com'
  readonly supportedContentTypes: SyncContentType[] = ['ARTICLE']

  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'ARTICLE':
        return this.getArticleFillScript(data as ArticleData)
      default:
        return `console.log('Unsupported content type: ${contentType}')`
    }
  }

  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const htmlContent = data.htmlContent || ''
    const images = data.images || []

    return `
      (async function() {
        // 获取图片上传配置
        async function getUploadConfig(filename) {
          const params = new URLSearchParams({ filename });
          const url = 'https://www.jianshu.com/upload_images/token.json?' + params.toString();
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
          });
          return await response.json();
        }

        // 上传单个图片
        async function uploadImage(fileInfo) {
          console.log('uploadImage', fileInfo);

          const config = await getUploadConfig(fileInfo.name);
          console.log('uploadConfig', config);

          const response = await fetch(fileInfo.url);
          const blob = await response.blob();

          const formData = new FormData();
          formData.append('token', config.token);
          formData.append('key', config.key);
          formData.append('file', blob, fileInfo.name);
          formData.append('x:protocol', 'https');

          try {
            const uploadResponse = await fetch('https://upload.qiniup.com/', {
              method: 'POST',
              body: formData,
            });

            if (!uploadResponse.ok) {
              throw new Error('HTTP error! status: ' + uploadResponse.status);
            }

            const result = await uploadResponse.json();
            console.log('Image upload result:', result);

            return result?.url || null;
          } catch (error) {
            console.log('Error uploading image:', error);
            return null;
          }
        }

        // 处理文章内容中的图片
        async function processContent(htmlContent, imageDatas) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          const images = doc.getElementsByTagName('img');

          console.log('images', images);

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const src = img.getAttribute('src');

            if (src) {
              console.log('try replace ', src);
              const fileInfo = imageDatas.find((f) => f.url === src);
              if (fileInfo) {
                const newUrl = await uploadImage(fileInfo);
                if (newUrl) {
                  img.setAttribute('src', newUrl);
                }
              }
            }
          }

          return doc.body.innerHTML;
        }

        // 发布文章
        async function publishArticle(articleData) {
          // 获取笔记本列表
          const notebooksResponse = await fetch('https://www.jianshu.com/author/notebooks', {
            method: 'GET',
            credentials: 'include',
          });

          if (!notebooksResponse.ok) {
            console.error('HTTP error! status: ' + notebooksResponse.status);
            return null;
          }

          const notebooks = await notebooksResponse.json();
          console.log('Notebooks:', notebooks);

          const notebookId = notebooks[0]?.id || null;

          // 创建新文章
          const createResponse = await fetch('https://www.jianshu.com/author/notes', {
            method: 'POST',
            credentials: 'include',
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notebook_id: notebookId,
              title: articleData.title,
              at_bottom: false,
            }),
          });

          if (!createResponse.ok) {
            console.error('HTTP error! status: ' + createResponse.status);
            return null;
          }

          const createResult = await createResponse.json();
          console.log('result', createResult);

          const noteId = createResult.id;

          // 更新文章内容
          const updateResponse = await fetch('https://www.jianshu.com/author/notes/' + noteId, {
            method: 'PUT',
            credentials: 'include',
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: noteId,
              autosave_control: 1,
              title: articleData.title,
              content: articleData.htmlContent,
            }),
          });

          if (!updateResponse.ok) {
            console.error('HTTP error! status: ' + updateResponse.status);
            return null;
          }

          const updateResult = await updateResponse.json();
          console.log('updateResult', updateResult);

          if (createResult.id) {
            console.log('草稿发布成功');
            return 'https://www.jianshu.com/writer#/notebooks/' + notebookId + '/notes/' + noteId + '/writing';
          }
          console.error('草稿发布失败', createResult.message);
          return null;
        }

        // 主流程
        const host = document.createElement('div');
        const tip = document.createElement('div');

        try {
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
                from {
                  transform: translateY(100%);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            </style>
            <div class="float-tip">
              正在同步文章到简书...
            </div>
          \`;
          shadow.appendChild(tip);

          const articleData = {
            title: ${JSON.stringify(title)},
            htmlContent: ${JSON.stringify(htmlContent)},
            images: ${JSON.stringify(images)},
          };

          // 处理图片
          if (articleData.images && articleData.images.length > 0) {
            articleData.htmlContent = await processContent(articleData.htmlContent, articleData.images);
          }

          const publishUrl = await publishArticle(articleData);

          if (publishUrl) {
            tip.querySelector('.float-tip').textContent = '文章同步成功！';

            setTimeout(() => {
              if (document.body.contains(host)) {
                document.body.removeChild(host);
              }
            }, 3000);

            window.location.href = publishUrl;
          } else {
            tip.querySelector('.float-tip').textContent = '同步失败，请重试';
            tip.querySelector('.float-tip').style.backgroundColor = '#dc2626';
          }
        } catch (error) {
          if (document.body.contains(host)) {
            tip.querySelector('.float-tip').textContent = '同步失败，请重试';
            tip.querySelector('.float-tip').style.backgroundColor = '#dc2626';

            setTimeout(() => {
              document.body.removeChild(host);
            }, 3000);
          }

          console.error('发布文章失败:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.jianshu.com'
    })
    return cookies.some((c) => c.name === 'remember_user_token' || c.name === 'web_login_version')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('jianshu.com')) {
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
            const avatar = document.querySelector('.avatar')?.src || document.querySelector('.user-avatar img')?.src;
            const nameEl = document.querySelector('.name') || document.querySelector('.username');
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
      ? PLATFORM_PUBLISH_URLS.jianshu[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('jianshu.com')) {
      await view.webContents.loadURL(url)
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
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 简书的发布按钮
          const publishBtn = document.querySelector('.submit-btn') ||
                            document.querySelector('.btn.btn-publish') ||
                            document.querySelector('[data-action="publish"]');

          if (publishBtn) {
            publishBtn.click();
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
