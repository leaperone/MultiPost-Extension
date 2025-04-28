/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleData, FileData, SyncData } from '~sync/common';

export async function ArticleWeibo(data: SyncData) {
  const articleData = data.data as ArticleData;

  async function getAccountId() {
    const res = await fetch('https://card.weibo.com/article/v3/editor');
    const html = await res.text();
    const match = html.match(/\$CONFIG\['uid'\]\s*=\s*(\d+);/);
    return match ? match[1] : null;
  }

  const accountId = await getAccountId();

  // 裁剪图片
  async function cropImage(fileInfo: FileData, ratio: number) {
    const canvas = document.createElement('canvas');

    const blob = await (await fetch(fileInfo.url)).blob();
    const file = new File([blob], fileInfo.name, { type: fileInfo.type });

    const base64Data = URL.createObjectURL(file);
    const img = new Image();

    img.src = base64Data;
    await new Promise((resolve) => {
      img.onload = () => {
        resolve(null);
      };
    });

    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    const width = img.width,
      heightByRatio = img.width / ratio;

    if (heightByRatio > img.height) {
      const widthByHeight = img.height * ratio;
      const height = img.height;
      const offsetX = (img.width - widthByHeight) / 2;

      canvas.width = widthByHeight;
      canvas.height = height;
      ctx?.drawImage(img, offsetX, 0, widthByHeight, height, 0, 0, widthByHeight, height);
    } else {
      const offsetY = (img.height - heightByRatio) / 2;

      canvas.width = width;
      canvas.height = heightByRatio;
      ctx?.drawImage(img, 0, offsetY, width, heightByRatio, 0, 0, width, heightByRatio);
    }

    const croppedImageData = canvas.toDataURL(fileInfo.type);
    console.debug('croppedImageData', croppedImageData, 'ratio -->', ratio);

    return { ...fileInfo, base64Data: croppedImageData };
  }

  // 上传图片
  async function uploadImage(fileInfo: FileData): Promise<string | null> {
    console.debug('uploadImage -->', fileInfo);

    const uploadUrl = new URL('https://picupload.weibo.com/interface/pic_upload.php');
    uploadUrl.searchParams.set('app', 'miniblog');
    uploadUrl.searchParams.set('s', 'json');
    uploadUrl.searchParams.set('p', '1');
    uploadUrl.searchParams.set('data', '1');
    uploadUrl.searchParams.set('url', 'weibo.com/ww');
    uploadUrl.searchParams.set('markpos', '1');
    uploadUrl.searchParams.set('logo', '1');
    uploadUrl.searchParams.set('nick', 'ww');
    uploadUrl.searchParams.set('file_source', '4');
    uploadUrl.searchParams.set('_rid', new Date().getTime().toString());

    const url = uploadUrl.toString();
    const blob = await (await fetch(fileInfo.url)).blob();

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: blob,
        credentials: 'include',
      });

      if (!response.ok) throw Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      console.debug('Image upload result:', result);

      if (result && result?.data?.pics?.pic_1?.pid) {
        return `https://wx2.sinaimg.cn/large/${result.data.pics.pic_1.pid}.jpg`;
      }
      return null;
    } catch (error) {
      console.debug('Error uploading image:', error);
      return null;
    }
  }

  // 处理文章内容中的图片
  async function processContent(
    htmlContent: string,
    imageFiles: FileData[],
    updateTip: (msg: string) => void,
  ): Promise<string> {
    const parser = new DOMParser(),
      doc = parser.parseFromString(htmlContent, 'text/html'),
      images = doc.getElementsByTagName('img');

    console.debug('images -->', images);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      updateTip(`正在上传第 ${i + 1}/${images.length} 张图片`);

      const src = img.getAttribute('src');
      if (src) {
        console.debug('try replace ', src);
        const fileInfo = imageFiles.find((f) => f.url === src);

        if (fileInfo) {
          const newUrl = await uploadImage(fileInfo);
          if (newUrl) {
            img.setAttribute('src', newUrl);
            console.debug('newUrl -->', newUrl);
          }
        }
      }
    }
    console.debug('doc.body.innerHTML -->', doc.body.innerHTML);
    return doc.body.innerHTML;
  }

  // 创建并保存草稿
  async function createAndSaveDraft(
    processedData: ArticleData,
    coverUrl: string | null,
    updateTip: (msg: string) => void,
  ): Promise<string | null> {
    updateTip('正在创建草稿...');

    // 创建草稿
    const createUrl = new URL('https://card.weibo.com/article/v3/aj/editor/draft/create');
    createUrl.searchParams.set('uid', accountId || '');
    createUrl.searchParams.set('_rid', new Date().getTime().toString());

    const createUrlString = createUrl.toString();
    const createResponse = await fetch(createUrlString, {
      method: 'POST',
      credentials: 'include',
    });

    const createResult = await createResponse.json();
    console.debug('createResult', createResult);

    const draftId = createResult.data.id;
    if (!draftId) {
      console.debug('草稿创建失败');
      return null;
    }

    // 保存草稿
    const saveUrl = new URL('https://card.weibo.com/article/v3/aj/editor/draft/save');
    saveUrl.searchParams.set('uid', accountId || '');
    saveUrl.searchParams.set('id', draftId);
    saveUrl.searchParams.set('_rid', new Date().getTime().toString());

    const saveUrlString = saveUrl.toString();
    const formData = new FormData();

    formData.append('title', processedData.title?.slice(0, 32) || '');
    formData.append('type', '');
    formData.append('summary', processedData.digest?.slice(0, 44) || '');
    formData.append('writer', '');
    formData.append('cover', coverUrl || '');
    formData.append('content', processedData.htmlContent || '');
    formData.append('collection', JSON.stringify([]));
    formData.append('updated', new Date().toISOString());
    formData.append('id', draftId);
    formData.append('subtitle', '');
    formData.append('extra', 'null');
    formData.append('status', '0');
    formData.append('publish_at', '');
    formData.append('error_msg', '');
    formData.append('error_code', '0');
    formData.append('free_content', '');
    formData.append('is_word', '0');
    formData.append('article_recommend', JSON.stringify({}));
    formData.append('publish_local_at', '');
    formData.append('timestamp', '');
    formData.append('is_article_free', '0');
    formData.append('only_render_h5', '0');
    formData.append('is_ai_plugins', '0');
    formData.append('is_aigc_used', '0');
    formData.append('is_v4', '0');
    formData.append('follow_to_read', '1');
    formData.append('follow_to_read_detail[result]', '1');
    formData.append('follow_to_read_detail[x]', '0');
    formData.append('follow_to_read_detail[y]', '0');
    formData.append('follow_to_read_detail[readme_link]', 'http://t.cn/A6UnJsqW');
    formData.append('follow_to_read_detail[level]', '');
    formData.append('follow_to_read_detail[daily_limit]', '1');
    formData.append('follow_to_read_detail[daily_limit_notes]', '非认证用户单日仅限1篇文章使用');
    formData.append('follow_to_read_detail[show_level_tips]', '0');
    formData.append('isreward', '0');
    formData.append('isreward_tips', '');
    formData.append(
      'isreward_tips_url',
      'https://card.weibo.com/article/v3/aj/editor/draft/applyisrewardtips?uid' + accountId,
    );
    formData.append('pay_setting', JSON.stringify([]));
    formData.append('source', '0');
    formData.append('action', '0');
    formData.append('is_single_pay_new', '');
    formData.append('money', '');
    formData.append('is_vclub_single_pay', '');
    formData.append('vclub_single_pay_money', '');
    formData.append('content_type', '0');
    formData.append('save', '1');
    formData.append('wbeditorRef', '9');
    formData.append('ver', '4.0');
    formData.append('_rid', new Date().getTime().toString());

    console.debug('formData -->', formData);

    const saveResponse = await fetch(saveUrlString, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const saveResult = await saveResponse.json();
    console.debug('result', saveResult);

    if (saveResult.code === 100000) {
      console.debug('草稿发布成功');
      return draftId;
    } else {
      console.debug('草稿发布失败', saveResult.msg);
      updateTip('草稿发布失败:' + saveResult.msg);
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
        正在同步文章到微博图文...
      </div>
    `;
    shadow.appendChild(tip);

    // 发布流程
    async function publishToWeibo() {
      try {
        // 处理文章内容中的图片
        articleData.htmlContent = await processContent(articleData.htmlContent, articleData.images || [], updateTip);

        // 处理封面图片
        updateTip('正在上传封面...');
        if (articleData.cover) {
          const croppedCover = await cropImage(articleData.cover, 16 / 9);
          const coverUrl = await uploadImage(croppedCover);

          if (!coverUrl) {
            console.debug('封面上传失败');
          }

          // 创建并保存草稿
          const draftId = await createAndSaveDraft(articleData, coverUrl, updateTip);

          if (draftId) {
            updateTip('草稿发布成功，请预览...');

            if (!data.isAutoPublish) {
              const draftUrl = 'https://card.weibo.com/article/v3/editor';
              console.debug('draftUrl', draftUrl);
              window.location.href = draftUrl;
            }
            return true;
          } else {
            updateTip('尝试 DOM 发布...');
            // 这里可以添加DOM发布的逻辑
            updateTip('请继续操作...');
            return false;
          }
        }
      } catch (error) {
        console.error('发布文章失败:', error);
        return false;
      }
    }

    publishToWeibo();

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
