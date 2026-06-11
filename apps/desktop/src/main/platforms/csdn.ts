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
 * CSDN platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: ARTICLE
 */
export class CsdnAdapter extends BasePlatformAdapter {
  readonly platform = 'csdn' as const
  readonly name = 'CSDN'
  readonly publishUrl = 'https://mp.csdn.net'
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
    const digest = data.digest || ''
    const images = data.images || []
    const cover = data.cover

    return `
      (async function() {
        // CSDN 签名函数
        async function signCSDN({
          method,
          accept,
          contentType,
          caKey,
          nonce,
          apiPath,
          hmac,
        }) {
          const signContent = method + '\\n' + accept + '\\n\\n' + contentType + '\\n\\nx-ca-key:' + caKey + '\\nx-ca-nonce:' + nonce + '\\n' + apiPath;
          const encoder = new TextEncoder();
          const data = encoder.encode(signContent);
          const keyData = encoder.encode(hmac);

          const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
          const signature = await crypto.subtle.sign('HMAC', key, data);
          return btoa(String.fromCharCode(...new Uint8Array(signature)));
        }

        // 获取图片上传配置
        async function getUploadConfig() {
          const params = new URLSearchParams({
            type: 'blog',
            rtype: 'blog_picture',
            'x-image-template': 'standard',
            'x-image-app': 'direct_blog',
            'x-image-dir': 'direct',
            'x-image-suffix': 'png',
          });

          const url = 'https://imgservice.csdn.net/direct/v1.0/image/obs/upload?' + params.toString();
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
          });
          const result = await response.json();
          return result.data;
        }

        // 上传单个图片
        async function uploadSingleImage(fileInfo, retryCount = 3) {
          console.log('开始上传图片:', fileInfo.name);

          for (let i = 0; i < retryCount; i++) {
            try {
              const config = await getUploadConfig();
              const response = await fetch(fileInfo.url);
              if (!response.ok) {
                throw new Error('获取图片失败: ' + response.status);
              }

              const blob = await response.blob();
              const file = new File([blob], fileInfo.name, { type: fileInfo.type });

              const formData = new FormData();
              formData.append('key', config.filePath);
              formData.append('policy', config.policy);
              formData.append('AccessKeyId', config.accessId);
              formData.append('signature', config.signature);
              formData.append('callbackUrl', config.callbackUrl);
              formData.append('callbackBody', config.callbackBody);
              formData.append('callbackBodyType', config.callbackBodyType);
              formData.append('x:rtype', config.customParam.rtype);
              formData.append('x:watermark', config.customParam.watermark);
              formData.append('x:templateName', config.customParam.templateName);
              formData.append('x:filePath', config.customParam.filePath);
              formData.append('x:isAudit', config.customParam.isAudit.toString());
              formData.append('x:x-image-app', config.customParam['x-image-app']);
              formData.append('x:type', config.customParam.type);
              formData.append('x:x-image-suffix', config.customParam['x-image-suffix']);
              formData.append('x:username', config.customParam.username);
              formData.append('file', file);

              const uploadResponse = await fetch('https://csdn-img-blog.obs.cn-north-4.myhuaweicloud.com/', {
                method: 'POST',
                body: formData,
                credentials: 'include',
              });

              if (!uploadResponse.ok) {
                throw new Error('上传失败: ' + uploadResponse.status);
              }

              const result = await uploadResponse.json();
              if (result?.data?.imageUrl) {
                console.log('图片上传成功:', result.data.imageUrl);
                return result.data.imageUrl;
              }
              throw new Error('上传返回数据格式错误');
            } catch (error) {
              console.error('第 ' + (i + 1) + ' 次上传失败:', error);
              if (i === retryCount - 1) {
                return null;
              }
              await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
            }
          }
          return null;
        }

        // 处理文章内容中的图片
        async function processContent(htmlContent, imageDatas) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          const images = Array.from(doc.getElementsByTagName('img'));

          console.log('处理文章图片，共 ' + images.length + ' 张');

          const uploadPromises = images.map(async (img) => {
            const src = img.getAttribute('src');
            if (!src) return;

            const fileInfo = imageDatas.find((f) => f.url === src);
            if (!fileInfo) return;

            const newUrl = await uploadSingleImage(fileInfo);
            if (newUrl) {
              img.setAttribute('src', newUrl);
            } else {
              console.error('图片处理失败:', src);
            }
          });

          await Promise.all(uploadPromises);
          return doc.body.innerHTML;
        }

        // 发布文章
        async function publishArticle(articleData) {
          console.log('开始发布文章:', articleData.title);

          let processedContent = articleData.htmlContent;
          if (articleData.images && articleData.images.length > 0) {
            processedContent = await processContent(articleData.htmlContent, articleData.images);
          }

          let coverUrl = '';
          if (articleData.cover) {
            coverUrl = await uploadSingleImage(articleData.cover);
          }

          const apiPath = '/blog-console-api/v1/postedit/saveArticle';
          const caKey = '203803574';
          const nonce = crypto.randomUUID();
          const signature = await signCSDN({
            method: 'POST',
            accept: '*/*',
            contentType: 'application/json',
            caKey,
            nonce,
            apiPath,
            hmac: '9znpamsyl2c7cdrr9sas0le9vbc3r6ba',
          });

          const requestBody = {
            article_id: '',
            title: articleData.title?.slice(0, 100),
            description: articleData.digest?.slice(0, 256),
            content: processedContent,
            markdowncontent: '',
            tags: '经验分享',
            categories: '',
            type: 'original',
            status: 2,
            read_type: 'public',
            reason: '',
            resource_url: '',
            resource_id: '',
            original_link: '',
            authorized_status: false,
            check_original: false,
            editor_type: 0,
            plan: [],
            vote_id: 0,
            scheduled_time: 0,
            level: '1',
            cover_type: 1,
            cover_images: [coverUrl || ''],
            not_auto_saved: 0,
            is_new: 1,
          };

          try {
            const response = await fetch('https://bizapi.csdn.net' + apiPath, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'x-ca-key': caKey,
                'x-ca-nonce': nonce,
                'x-ca-signature': signature,
                'x-ca-signature-headers': 'x-ca-key,x-ca-nonce',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              console.error('发布请求失败:', response.status);
              return null;
            }

            const result = await response.json();
            if (result.code === 200) {
              console.log('文章发布成功，ID:', result.data.article_id);
              return result.data.article_id;
            }
            console.error('发布失败:', result);
            return null;
          } catch (error) {
            console.error('发布过程出错:', error);
            return null;
          }
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
              正在同步文章到CSDN...
            </div>
          \`;
          shadow.appendChild(tip);

          const articleData = {
            title: ${JSON.stringify(title)},
            htmlContent: ${JSON.stringify(htmlContent)},
            digest: ${JSON.stringify(digest)},
            images: ${JSON.stringify(images)},
            cover: ${JSON.stringify(cover)},
          };

          const articleId = await publishArticle(articleData);

          if (articleId) {
            tip.querySelector('.float-tip').textContent = '文章同步成功！';

            setTimeout(() => {
              if (document.body.contains(host)) {
                document.body.removeChild(host);
              }
            }, 3000);

            window.location.href = 'https://mp.csdn.net/mp_blog/creation/editor/' + articleId;
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
      domain: '.csdn.net'
    })
    return cookies.some((c) => c.name === 'UserToken' || c.name === 'dc_session_id')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('csdn.net')) {
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
            const avatar = document.querySelector('.avatar-pic img')?.src || document.querySelector('.toolbar-avatar img')?.src;
            const nameEl = document.querySelector('.toolbar-username') || document.querySelector('.user-name');
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
      ? PLATFORM_PUBLISH_URLS.csdn[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('csdn.net')) {
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

          const buttons = document.querySelectorAll('button');
          const publishButton = Array.from(buttons).find(
            button => button.textContent?.includes('发布') || button.textContent?.includes('保存')
          );

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
