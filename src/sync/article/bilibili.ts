import type { ArticleData, FileData, SyncData } from '~sync/common';

export async function ArticleBilibili(data: SyncData) {
  const articleData = data.data as ArticleData;

  // 等待元素出现
  async function waitForElement(selector: string): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 设置超时
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 10000);
    });
  }

  // 显示进度提示
  function showProgress(message: string) {
    // 创建或更新漂浮提示
    let host = document.getElementById('multipost-progress');
    if (!host) {
      host = document.createElement('div');
      host.id = 'multipost-progress';
      host.style.position = 'fixed';
      host.style.bottom = '20px';
      host.style.right = '20px';
      host.style.zIndex = '9999';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          .float-tip {
            background: #1e293b;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
        </style>
        <div class="float-tip"></div>
      `;
    }

    const tip = host.shadowRoot?.querySelector('.float-tip') as HTMLDivElement;
    if (tip) {
      tip.textContent = message;
    }
  }

  // 获取B站CSRF令牌
  function getBiliJct(): string {
    const biliJct = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('bili_jct='))
      ?.trim()
      .split('=')[1];

    console.debug('biliJct', biliJct);
    return biliJct || '';
  }

  // 获取buvid3
  function getBuvid3(): string {
    const buvid = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('buvid3='))
      ?.trim()
      .split('=')[1];

    console.debug('buvid', buvid);
    return buvid || '';
  }

  // 上传单个图片
  async function uploadSingleImage(fileInfo: FileData): Promise<string | null> {
    try {
      if (!fileInfo) return null;

      console.debug('uploadDynamicImage', fileInfo);
      const blob = await (await fetch(fileInfo.url)).blob();

      const formData = new FormData();
      formData.append('file_up', blob);
      formData.append('biz', 'new_dyn');
      formData.append('category', 'daily');
      formData.append('csrf', getBiliJct());

      try {
        const response = await fetch('https://api.bilibili.com/x/dynamic/feed/draw/upload_bfs', {
          method: 'POST',
          body: formData,
          headers: {
            Cookie: `bili_jct=${getBiliJct()}; buvid3=${getBuvid3()};`,
          },
          credentials: 'include',
        });

        if (!response.ok) throw Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        console.debug('Image upload result:', result);

        if (result.code === 0 && result.data) {
          return result.data.image_url;
        }

        throw Error(`Upload failed: ${result.message}`);
      } catch (error) {
        console.error('Error uploading image:', error);
      }

      return null;
    } catch (error) {
      console.debug('上传图片失败:', error);
      return null;
    }
  }

  // 处理文章内容中的图片
  async function processContent(htmlContent: string, imageDatas: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images = Array.from(doc.getElementsByTagName('img'));

    console.debug('images', images);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      showProgress(`正在上传第 ${i + 1}/${images.length} 张图片`);

      const src = img.getAttribute('src');
      if (src) {
        console.debug('try replace ', src);
        const fileInfo = imageDatas.find((f) => f.url === src);
        const newUrl = await uploadSingleImage(fileInfo);
        if (newUrl) {
          img.setAttribute('src', newUrl);
        }
      }
    }

    return doc.body.innerHTML;
  }

  // 发布文章
  async function publishArticle(articleData: ArticleData): Promise<string | null> {
    const processedContent = await processContent(articleData.htmlContent, articleData.images || []);

    const formData = new FormData();
    formData.append('title', articleData.title?.slice(0, 40) || '');
    formData.append('content', processedContent || '');
    formData.append('summary', articleData.digest || '');
    formData.append('banner_url', '');

    const parser = new DOMParser();
    const doc = parser.parseFromString(articleData.htmlContent || '', 'text/html');
    const wordCount = doc.documentElement.textContent?.length || 0;

    formData.append('words', wordCount.toString());
    formData.append('category', '0');
    formData.append('list_id', '0');
    formData.append('tid', '0');
    formData.append('reprint', '0');
    formData.append('tags', '');
    formData.append('image_urls', '');
    formData.append('origin_image_urls', '');
    formData.append('dynamic_intro', '');
    formData.append('media_id', '0');
    formData.append('spoiler', '0');
    formData.append('original', '0');
    formData.append('top_video_bvid', '');
    formData.append('csrf', getBiliJct());

    console.debug('formData', formData);

    try {
      const response = await fetch('https://api.bilibili.com/x/article/creative/draft/addupdate', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      console.debug('result', result);

      if (result.code === 0) {
        console.debug('草稿发布成功');
        return result.data.aid;
      } else {
        console.debug('草稿发布失败', result.message);
        return null;
      }
    } catch (error) {
      console.debug('发布过程出错:', error);
      return null;
    }
  }

  // 主流程
  async function main() {
    try {
      // 等待B站编辑器元素加载
      await waitForElement('textarea[placeholder="请输入标题（建议30字以内）"]');

      showProgress('正在同步文章到B站...');

      const articleId = await publishArticle(articleData);

      if (articleId) {
        showProgress('草稿发布成功，即将前往预览...');

        if (!data.isAutoPublish) {
          // 跳转到B站草稿编辑页
          setTimeout(() => {
            window.location.href = `https://member.bilibili.com/article-text/home?aid=${articleId}`;
          }, 1000);
        }

        setTimeout(() => {
          const host = document.getElementById('multipost-progress');
          if (host) document.body.removeChild(host);
        }, 3000);

        return;
      }

      alert('同步出了点问题，请稍后再试...');
    } catch (error) {
      console.debug('发布文章失败:', error);

      showProgress('同步失败，请重试');
      setTimeout(() => {
        const host = document.getElementById('multipost-progress');
        if (host) document.body.removeChild(host);
      }, 3000);

      throw error;
    }
  }

  // 开始执行
  main();
}
