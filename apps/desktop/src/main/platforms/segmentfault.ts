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
 * SegmentFault platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: ARTICLE
 */
export class SegmentfaultAdapter extends BasePlatformAdapter {
  readonly platform = 'segmentfault' as const
  readonly name = '思否'
  readonly publishUrl = 'https://segmentfault.com'
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
    const markdownContent = data.markdownContent || ''
    const images = data.images || []
    const cover = data.cover

    return `
      (async function() {
        // 获取 PHPSESSID cookie
        function getCookie(name) {
          const value = '; ' + document.cookie;
          const parts = value.split('; ' + name + '=');
          return parts.length === 2 ? (parts.pop()?.split(';').shift() ?? null) : null;
        }

        // 上传图片到思否服务器
        async function uploadImage(file) {
          try {
            const response = await fetch(file.url);
            const blob = await response.blob();
            const imageFile = new File([blob], file.name, { type: file.type });

            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResponse = await fetch('https://segmentfault.com/gateway/image', {
              method: 'POST',
              body: formData,
              headers: {
                token: getCookie('PHPSESSID') ?? '',
              },
            });

            if (!uploadResponse.ok) {
              throw new Error('上传图片失败: ' + uploadResponse.status);
            }

            const result = await uploadResponse.json();
            console.debug('图片上传结果:', result);
            return result.url;
          } catch (error) {
            console.error('上传图片错误:', error);
            return null;
          }
        }

        // 发布草稿到思否
        async function publishDraft(content, coverUrl) {
          try {
            const response = await fetch('https://segmentfault.com/gateway/draft', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                token: getCookie('PHPSESSID') ?? '',
              },
              body: JSON.stringify({
                title: ${JSON.stringify(title)},
                tags: [],
                text: content,
                object_id: '',
                type: 'article',
                language: '',
                cover: coverUrl,
              }),
            });

            if (!response.ok) {
              throw new Error('发布草稿失败: ' + response.status);
            }

            const result = await response.json();
            console.debug('发布结果:', result);
            return result.id ?? null;
          } catch (error) {
            console.error('发布草稿错误:', error);
            return null;
          }
        }

        // 处理文章内容中的图片
        async function processContent(htmlContent, imageDatas) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          const images = Array.from(doc.getElementsByTagName('img'));

          console.debug('找到图片元素数量:', images.length);
          console.debug('可用的文件数据:', imageDatas);

          const uploadPromises = images.map(async (img) => {
            const src = img.getAttribute('src');
            console.debug('处理图片 src:', src);

            if (!src) return;

            const fileInfo = imageDatas?.find((f) => f.url === src);
            console.debug('找到对应的文件信息:', fileInfo);

            if (fileInfo) {
              const newUrl = await uploadImage(fileInfo);
              console.debug('上传后的新URL:', newUrl);

              if (newUrl) {
                img.setAttribute('src', newUrl);
              }
            }
          });

          await Promise.all(uploadPromises);
          return doc.body.innerHTML;
        }

        // 处理 Markdown 内容中的图片
        async function processMarkdownContent(content, imageDatas) {
          console.debug('开始处理 Markdown 内容:', {
            contentLength: content.length,
            imageDatasCount: imageDatas?.length ?? 0,
          });

          let processedContent = content;

          // 匹配 markdown 图片语法 ![alt](url)
          const imageRegex = /!\\[([^\\]]*)\\]\\(([^)]+)\\)/g;
          const matches = Array.from(content.matchAll(imageRegex));

          console.debug('找到 Markdown 图片:', matches.map((m) => ({ url: m[2] })));

          for (const match of matches) {
            const [fullMatch, alt, url] = match;
            const fileInfo = imageDatas?.find((f) => f.url === url);

            if (fileInfo) {
              const newUrl = await uploadImage(fileInfo);
              if (newUrl) {
                const newImageMarkdown = '![' + alt + '](' + newUrl + ')';
                processedContent = processedContent.replace(fullMatch, newImageMarkdown);
                console.debug('图片替换完成:', { from: url, to: newUrl });
              }
            }
          }

          return processedContent;
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
              正在同步文章到思否...
            </div>
          \`;
          shadow.appendChild(tip);

          const images = ${JSON.stringify(images)};
          const cover = ${JSON.stringify(cover)};
          const markdownContent = ${JSON.stringify(markdownContent)};
          const htmlContent = ${JSON.stringify(htmlContent)};

          console.debug('开始处理文章:', {
            hasMarkdown: !!markdownContent,
            filesCount: images?.length,
          });

          // 上传封面图片
          let coverUrl = null;
          if (cover) {
            coverUrl = await uploadImage(cover);
          }

          let processedContent;
          if (markdownContent) {
            processedContent = await processMarkdownContent(markdownContent, images);
          } else {
            processedContent = await processContent(htmlContent, images);
          }

          // 发布文章
          const draftId = await publishDraft(processedContent, coverUrl);

          // 发布成功后更新提示
          tip.querySelector('.float-tip').textContent = '文章同步成功！';

          // 3秒后移除提示
          setTimeout(() => {
            if (document.body.contains(host)) {
              document.body.removeChild(host);
            }
          }, 3000);

          // 跳转到编辑页面
          if (draftId) {
            window.location.href = 'https://segmentfault.com/write?draftId=' + draftId;
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
      domain: '.segmentfault.com'
    })
    return cookies.some((c) => c.name === 'PHPSESSID')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const currentUrl = view.webContents.getURL()
      if (!currentUrl.includes('segmentfault.com')) {
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
            const avatar = document.querySelector('.user-avatar img')?.src || document.querySelector('.avatar img')?.src;
            const nameEl = document.querySelector('.user-name') || document.querySelector('.username');
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
      ? PLATFORM_PUBLISH_URLS.segmentfault[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes('segmentfault.com')) {
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
