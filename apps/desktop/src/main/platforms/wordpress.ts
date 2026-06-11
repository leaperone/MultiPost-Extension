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
 * WordPress platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: ARTICLE
 * Note: Works with both Classic Editor and Gutenberg (Block Editor)
 */
export class WordpressAdapter extends BasePlatformAdapter {
  readonly platform = 'wordpress' as const
  readonly name = 'WordPress'
  readonly publishUrl = 'https://wordpress.com'
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
        // 通过 classic editor 上传图片
        async function uploadMediaClassic(fileData, postId) {
          console.debug('uploadMediaClassic', fileData);

          // 获取上传 nonce
          const uploadNonceMatch = document.body.innerHTML.match(/{"action":"upload-attachment","_wpnonce":"([^"]+)"}/);
          const uploadNonce = uploadNonceMatch?.[1];
          console.debug('uploadAttachmentNonce', uploadNonce);

          const uploadUrl = window.location.origin + '/wp-admin/async-upload.php';

          // 获取文件内容
          const blob = await (await fetch(fileData.url)).blob();
          const file = new File([blob], fileData.name, { type: fileData.type });

          // 构建表单数据
          const formData = new FormData();
          formData.append('name', fileData.name);
          formData.append('action', 'upload-attachment');
          formData.append('_wpnonce', uploadNonce);
          formData.append('post_id', postId);
          formData.append('async-upload', file);

          try {
            const response = await fetch(uploadUrl, {
              method: 'POST',
              body: formData,
              headers: {},
            });

            if (!response.ok) {
              throw new Error('HTTP error! status: ' + response.status);
            }

            const result = await response.json();
            console.debug('Image upload result:', result);

            return result?.data?.sizes?.large?.url || result?.data?.sizes?.full?.url || result?.data?.sizes?.medium?.url;
          } catch (error) {
            console.debug('Error uploading image:', error);
            return undefined;
          }
        }

        // 通过 API 上传图片
        async function uploadMediaApi(fileData, postId) {
          console.debug('uploadMediaApi', fileData);

          // 获取 nonce
          const nonceMatch = document.body.innerHTML.match(/wp\\.apiFetch\\.createNonceMiddleware\\(([^)]+)\\)/);
          const nonceQuote = nonceMatch?.[1];
          console.debug('nonceQuote', nonceQuote);
          const nonce = nonceQuote?.match(/"([^"]+)"/)?.[1];
          console.debug('nonce', nonce);

          const uploadUrl = window.location.origin + '/wp-json/wp/v2/media?_locale=user';

          // 获取文件内容
          const blob = await (await fetch(fileData.url)).blob();
          const file = new File([blob], fileData.name, { type: fileData.type });

          // 构建表单数据
          const formData = new FormData();
          formData.append('file', file);
          formData.append('post', postId);

          try {
            const response = await fetch(uploadUrl, {
              method: 'POST',
              body: formData,
              headers: {
                'x-wp-nonce': nonce,
              },
            });

            if (!response.ok) {
              throw new Error('HTTP error! status: ' + response.status);
            }

            const result = await response.json();
            console.debug('Image upload result:', JSON.stringify(result));

            return result?.source_url;
          } catch (error) {
            console.debug('Error uploading image:', error);
            return undefined;
          }
        }

        // 处理文章内容中的图片
        async function processContent(articleData, postId, isClassicEditor) {
          // 使用 DOMParser 解析内容
          const parser = new DOMParser();
          const doc = parser.parseFromString(articleData.htmlContent, 'text/html');
          const images = doc.getElementsByTagName('img');

          // 处理每个图片
          for (const img of Array.from(images)) {
            const originalSrc = img.getAttribute('src');
            if (originalSrc) {
              console.debug('try replace image:', originalSrc);
              const fileData = articleData.images.find((file) => file.url === originalSrc);

              if (fileData) {
                // 上传图片并获取新的 URL
                const newUrl = isClassicEditor
                  ? await uploadMediaClassic(fileData, postId)
                  : await uploadMediaApi(fileData, postId);

                console.debug('newUrl', newUrl);
                // 替换图片 URL
                if (newUrl) {
                  img.setAttribute('src', newUrl);
                }
              }
            }
          }

          // 更新内容
          console.log('doc.body.innerHTML', doc.body.innerHTML);
          articleData.htmlContent = doc.body.innerHTML;
          console.log('articleData.htmlContent', articleData.htmlContent);
          return articleData;
        }

        // 通过 classic editor 发布草稿
        async function publishDraftClassic(articleData, postId) {
          console.debug('publishDraftClassic');

          const ajaxUrl = window.location.origin + '/wp-admin/admin-ajax.php';
          const formData = new FormData();

          // 构建表单数据
          formData.append('data[wp_autosave][post_id]', postId);
          formData.append('data[wp_autosave][post_type]', 'post');
          formData.append('data[wp_autosave][post_author]', '1');
          formData.append('data[wp_autosave][post_title]', articleData.title);
          formData.append('data[wp_autosave][content]', articleData.htmlContent);
          formData.append('data[wp_autosave][excerpt]', '');
          formData.append('data[wp_autosave][catslist]', '');
          formData.append('data[wp_autosave][comment_status]', 'open');
          formData.append('data[wp_autosave][ping_status]', 'open');

          // 获取必要的 nonce
          const wpNonce = document.querySelector('#_wpnonce');
          formData.append('data[wp_autosave][_wpnonce]', wpNonce?.value);
          formData.append('data[wp-refresh-post-nonces][post_id]', postId);

          // 添加心跳检查相关数据
          const heartbeatNonce = document.body.innerHTML.match(/heartbeatSettings = \\{"nonce":"([^"]+)"/)?.[1];
          formData.append('_nonce', heartbeatNonce);
          formData.append('action', 'heartbeat');
          formData.append('screen_id', 'post');
          formData.append('has_focus', 'false');
          formData.append('interval', '60');

          try {
            const response = await fetch(ajaxUrl, {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('HTTP error! status: ' + response.status);
            }

            const result = await response.json();
            console.debug('result', result);

            return result?.wp_autosave?.success || false;
          } catch (error) {
            console.debug('Error publishing draft:', error);
            return false;
          }
        }

        // 通过 API 发布草稿
        async function publishDraftApi(articleData, postId) {
          console.debug('publishDraftApi');

          // 获取 nonce
          const nonceMatch = document.body.innerHTML.match(/wp\\.apiFetch\\.createNonceMiddleware\\(([^)]+)\\)/);
          const nonceQuote = nonceMatch?.[1];
          const nonce = nonceQuote?.match(/"([^"]+)"/)?.[1];

          const apiUrl = window.location.origin + '/wp-json/wp/v2/posts/' + postId + '?_locale=user';

          try {
            const response = await fetch(apiUrl, {
              method: 'POST',
              body: JSON.stringify({
                id: postId,
                title: articleData.title,
                content: articleData.htmlContent,
              }),
              headers: {
                'Content-Type': 'application/json',
                'x-wp-nonce': nonce,
                'x-http-method-override': 'PUT',
              },
            });

            if (!response.ok) {
              throw new Error('HTTP error! status: ' + response.status);
            }

            const result = await response.json();
            console.debug('result', result);

            return !!result?.id;
          } catch (error) {
            console.debug('Error publishing draft:', error);
            return false;
          }
        }

        // 主流程
        try {
          // 获取文章 ID
          const postIdInput = document.querySelector('input#post_ID');
          const postId = postIdInput?.value;

          if (!postId) {
            throw new Error('未找到文章ID');
          }

          // 判断编辑器类型
          const isClassicEditor = !!document.querySelector('input#title');

          const articleData = {
            title: ${JSON.stringify(title)},
            htmlContent: ${JSON.stringify(htmlContent)},
            images: ${JSON.stringify(images)},
          };

          // 处理文章内容（包括图片上传）
          const processedData = await processContent(articleData, postId, isClassicEditor);

          console.debug('processedData', processedData);

          // 发布草稿
          const success = isClassicEditor
            ? await publishDraftClassic(processedData, postId)
            : await publishDraftApi(processedData, postId);

          if (!success) {
            throw new Error('发布草稿失败');
          }

          // 跳转到编辑页面
          window.location.href = '/wp-admin/post.php?post=' + postId + '&action=edit';

          console.log('文章内容填写完成');
        } catch (error) {
          console.debug('发布文章失败:', error);
          throw error;
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    // WordPress 可以是自托管的，需要检查多种可能的登录 cookie
    try {
      const currentUrl = view.webContents.getURL()
      const url = new URL(currentUrl)
      const domain = url.hostname

      const cookies = await view.webContents.session.cookies.get({
        domain
      })

      // 检查 WordPress 登录相关的 cookie
      return cookies.some(
        (c) =>
          c.name.startsWith('wordpress_logged_in') ||
          c.name === 'wordpress_logged_in' ||
          c.name.includes('wordpress_logged_in')
      )
    } catch {
      return false
    }
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
            // WordPress admin bar has user info
            const avatar = document.querySelector('#wp-admin-bar-my-account img')?.src;
            const nameEl = document.querySelector('#wp-admin-bar-my-account .display-name') ||
                          document.querySelector('#wp-admin-bar-my-account .username');
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
      ? PLATFORM_PUBLISH_URLS.wordpress[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    // WordPress 可以是自托管的，所以不检查域名
    if (!currentUrl.includes('wp-admin')) {
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

          // Classic editor publish button
          let publishButton = document.querySelector('#publish');

          // Gutenberg publish button
          if (!publishButton) {
            const buttons = document.querySelectorAll('button');
            publishButton = Array.from(buttons).find(
              button => button.textContent?.includes('Publish') ||
                       button.textContent?.includes('发布') ||
                       button.textContent?.includes('Update') ||
                       button.textContent?.includes('更新')
            );
          }

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
