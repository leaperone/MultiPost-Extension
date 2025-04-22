import type { ArticleData, FileData, SyncData } from '~sync/common';

export async function ArticleSegmentfault(data: SyncData) {
  console.debug('ArticleSegmentfault', data);
  const articleData = data.data as ArticleData;

  // 获取 PHPSESSID cookie
  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop()?.split(';').shift() ?? null : null;
  }

  // 上传图片到思否服务器
  async function uploadImage(file: FileData): Promise<string | null> {
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
        throw new Error(`上传图片失败: ${uploadResponse.status}`);
      }

      const result = await uploadResponse.json();
      console.debug('图片上传结果:', result);
      return result.url;
    } catch (error) {
      console.error('上传图片错误:', error);
      return null;
    }
  }

  // 发布文章到思否
  async function publishDraft(content: string, coverUrl: string | null): Promise<string | null> {
    try {
      // 使用 markdown 内容如果存在
      const textContent = content;

      const response = await fetch('https://segmentfault.com/gateway/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: getCookie('PHPSESSID') ?? '',
        },
        body: JSON.stringify({
          title: articleData.title,
          tags: [],
          text: textContent,
          object_id: '',
          type: 'article',
          language: '',
          cover: coverUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`发布草稿失败: ${response.status}`);
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
  async function processContent(htmlContent: string, imageDatas: FileData[]): Promise<string> {
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
  async function processMarkdownContent(content: string, imageDatas: FileData[]): Promise<string> {
    console.debug('开始处理 Markdown 内容:', {
      contentLength: content.length,
      imageDatasCount: imageDatas?.length ?? 0,
    });

    let processedContent = content;

    // 匹配 markdown 图片语法 ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = Array.from(content.matchAll(imageRegex));

    console.debug(
      '找到 Markdown 图片:',
      matches.map((m) => ({
        url: m[2],
      })),
    );

    for (const match of matches) {
      const [fullMatch, alt, url] = match;
      const fileInfo = imageDatas?.find((f) => f.url === url);

      if (fileInfo) {
        const newUrl = await uploadImage(fileInfo);
        if (newUrl) {
          const newImageMarkdown = `![${alt}](${newUrl})`;
          processedContent = processedContent.replace(fullMatch, newImageMarkdown);
          console.debug('图片替换完成:', {
            from: url,
            to: newUrl,
          });
        }
      }
    }

    return processedContent;
  }

  // 主流程
  const host = document.createElement('div') as HTMLDivElement;
  const tip = document.createElement('div') as HTMLDivElement;

  try {
    // 添加漂浮提示
    host.style.position = 'fixed';
    host.style.bottom = '20px';
    host.style.right = '20px';
    host.style.zIndex = '9999';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    tip.innerHTML = `
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
    `;
    shadow.appendChild(tip);

    console.debug('开始处理文章:', {
      hasMarkdown: !!articleData.markdownContent,
      filesCount: articleData.images?.length,
    });

    // 上传封面图片
    let coverUrl = null;
    if (articleData.cover) {
      coverUrl = await uploadImage(articleData.cover);
    }

    let processedContent;
    if (articleData.markdownContent) {
      processedContent = await processMarkdownContent(articleData.markdownContent, articleData.images);
    } else {
      processedContent = await processContent(articleData.htmlContent, articleData.images);
    }

    // 发布文章
    const draftId = await publishDraft(processedContent, coverUrl);

    // 发布成功后更新提示
    (tip.querySelector('.float-tip') as HTMLDivElement).textContent = '文章同步成功！';

    // 3秒后移除提示
    setTimeout(() => {
      document.body.removeChild(host);
    }, 3000);

    // 如果不是自动发布，跳转到预览页面
    if (!data.isAutoPublish) {
      window.location.href = `https://segmentfault.com/write?draftId=${draftId}`;
    }
  } catch (error) {
    // 发生错误时更新提示
    if (document.body.contains(host)) {
      const floatTip = tip.querySelector('.float-tip') as HTMLDivElement;
      floatTip.textContent = '同步失败，请重试';
      floatTip.style.backgroundColor = '#dc2626';

      setTimeout(() => {
        document.body.removeChild(host);
      }, 3000);
    }

    console.error('发布文章失败:', error);
    throw error;
  }
}
