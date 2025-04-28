/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleData, FileData, SyncData } from '~sync/common';

export async function Article51CTO(data: SyncData) {
  const articleData = data.data as ArticleData;

  // 获取上传签名
  async function getUploadSign(): Promise<{ sign: string }> {
    try {
      const formData = new FormData();
      formData.append('upload_type', 'image');

      const response = await fetch('https://blog.51cto.com/getUploadSign', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.debug('getUploadSign result', result);
      return result.data;
    } catch (error) {
      console.error('获取上传签名失败:', error);
      throw error;
    }
  }

  // 获取上传配置
  async function getUploadConfig(
    fileType: string,
    fileName: string,
  ): Promise<{ accessid: string; policy: string; signature: string; dir: string }> {
    try {
      const signData = await getUploadSign();
      const formData = new FormData();

      formData.append('upload_type', 'image');
      formData.append('upload_sign', signData.sign);
      formData.append('ext', fileType);
      formData.append('name', fileName);

      const response = await fetch('https://blog.51cto.com/getUploadConfig', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.debug('getUploadConfig result', result);
      return result.data;
    } catch (error) {
      console.error('获取上传配置失败:', error);
      throw error;
    }
  }

  // 上传单个图片
  async function uploadImage(fileInfo: FileData): Promise<string | null> {
    try {
      console.debug('uploadImage', fileInfo);

      const config = await getUploadConfig(fileInfo.type, fileInfo.name);
      console.debug('uploadConfig', config);

      const blob = await (await fetch(fileInfo.url)).blob();
      const file = new File([blob], fileInfo.name, { type: fileInfo.type });

      const formData = new FormData();
      formData.append('OSSAccessKeyId', config.accessid);
      formData.append('policy', config.policy);
      formData.append('signature', config.signature);
      formData.append('key', config.dir);
      formData.append('success_action_status', '200');
      formData.append('file', file);

      const response = await fetch('https://51cto-edu-image.oss-cn-beijing.aliyuncs.com/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.debug('Image upload result:', response);
      return `https://s2.51cto.com/${config.dir}?x-oss-process=image/watermark,size_14,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_100,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=,x-oss-process=image/resize,m_fixed,w_1184`;
    } catch (error) {
      console.error('上传图片失败:', error);
      return null;
    }
  }

  // 处理文章内容中的图片
  async function processContent(htmlContent: string, imageFiles: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images = doc.getElementsByTagName('img');

    console.debug('images', images);

    for (let i = 0; i < images.length; i++) {
      updateTip(`正在上传第 ${i + 1}/${images.length} 张图片`);

      const img = images[i];
      const src = img.getAttribute('src');

      if (src) {
        console.debug('try replace ', src);
        const fileInfo = imageFiles.find((f) => f.url === src);

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
  async function publishArticle(articleData: ArticleData): Promise<string | null> {
    try {
      // 处理文章内容中的图片
      articleData.htmlContent = await processContent(articleData.htmlContent, articleData.images || []);

      // 获取CSRF令牌
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      // 创建表单数据
      const formData = new FormData();
      formData.append('title', articleData.title || '');
      formData.append('content', articleData.htmlContent || '');
      formData.append('pid', '');
      formData.append('cate_id', '');
      formData.append('custom_id', '');
      formData.append('tag', '');
      formData.append('abstract', articleData.digest || '');
      formData.append('banner_type', '0');
      formData.append('blog_type', '1');
      formData.append('copy_code', '1');
      formData.append('is_hide', '0');
      formData.append('top_time', '');
      formData.append('is_comment', '');
      formData.append('is_old', '2');
      formData.append('blog_id', '');
      formData.append('did', '');
      formData.append('work_id', '');
      formData.append('class_id', '');
      formData.append('subjectId', '');
      formData.append('import_type', '-1');
      formData.append('invite_code', '');
      formData.append('raffle', '');
      formData.append('orig', '');
      formData.append('_csrf', csrfToken);

      // 发送请求
      const response = await fetch('https://blog.51cto.com/blogger/draft', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.debug('result', result);

      if (result?.data?.did) {
        console.debug('草稿发布成功');
        return result.data.did;
      } else {
        console.debug('草稿发布失败', result.message);
        return null;
      }
    } catch (error) {
      console.error('发布文章失败:', error);
      return null;
    }
  }

  // 更新提示
  function updateTip(message: string) {
    const tipElement = tip.querySelector('.float-tip') as HTMLDivElement;
    if (tipElement) {
      tipElement.textContent = message;
    }
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
        正在同步文章到51CTO博客...
      </div>
    `;
    shadow.appendChild(tip);

    // 发布文章
    const draftId = await publishArticle(articleData);

    if (draftId) {
      updateTip('草稿发布成功，即将前往预览...');

      if (!data.isAutoPublish) {
        window.location.href = `https://blog.51cto.com/blogger/draft/${draftId}`;
      }
    } else {
      updateTip('同步出了点问题，请稍后再试...');
    }

    // 3秒后移除提示
    setTimeout(() => {
      if (document.body.contains(host)) {
        document.body.removeChild(host);
      }
    }, 3000);
  } catch (error) {
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
