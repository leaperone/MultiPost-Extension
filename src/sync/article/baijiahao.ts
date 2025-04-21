import type { ArticleData, FileData, SyncData } from '~sync/common';

interface CoverResult {
  originSrc: string;
  src: string | null;
  cropParams: { x: number; y: number; w: number; h: number };
  ratio: number;
}

export async function ArticleBaijiahao(data: SyncData) {
  const articleData = data.data as ArticleData;
  // 上传单个图片
  async function uploadSingleImage(fileInfo: FileData): Promise<string | null> {
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
        headers: {
          Token: getEditToken(),
        },
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.status}`);
      }

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

  // 获取编辑token
  function getEditToken(): string {
    const token = localStorage.getItem('edit-token')?.replace(/"/g, '');
    return token || '';
  }

  // 裁剪图片
  async function cropImage(
    src: string,
    params: { x: number; y: number; w: number; h: number },
  ): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('auto', 'true');
      formData.append('x', params.x.toString());
      formData.append('y', params.y.toString());
      formData.append('w', params.w.toString());
      formData.append('h', params.h.toString());
      formData.append('src', src);
      formData.append('type', 'newsRow');
      formData.append('cutting_type', 'cover_image');

      const response = await fetch('https://baijiahao.baidu.com/pcui/Picture/CuttingPicproxy', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`裁剪失败: ${response.status}`);
      }

      const result = await response.json();
      if (result.errno === 0 && result.data?.https_src) {
        return result.data.https_src;
      }
      throw new Error(result.errmsg || '裁剪图片失败');
    } catch (error) {
      console.error('裁剪图片失败:', error);
      return null;
    }
  }

  // 处理文章内容中的图片
  async function processContent(htmlContent: string, imageDatas: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images = Array.from(doc.getElementsByTagName('img'));

    console.log(`处理文章图片，共 ${images.length} 张`);

    const uploadPromises = images.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src) return;

      const fileInfo = imageDatas.find((f) => f.url === src);
      if (!fileInfo) return;

      const newUrl = await uploadSingleImage(fileInfo);
      if (newUrl) {
        img.setAttribute('src', newUrl);
      } else {
        console.error(`图片处理失败: ${src}`);
      }
    });

    await Promise.all(uploadPromises);
    return doc.body.innerHTML;
  }

  // 处理封面图片上传和裁剪
  async function processCover(cover: FileData): Promise<CoverResult[] | null> {
    const coverUrl = await uploadSingleImage(cover);
    if (!coverUrl) return null;

    // 获取图片实际尺寸
    const dimensions = await getImageDimensions(coverUrl);
    if (!dimensions) return null;

    // 计算1.5和0.75比例的裁剪参数
    const horizontalCrop = calculateCropParams(dimensions.width, dimensions.height, 1.5);
    const verticalCrop = calculateCropParams(dimensions.width, dimensions.height, 0.75);

    // 裁剪封面图
    const horizontalCoverUrl = await cropImage(coverUrl, horizontalCrop);
    const verticalCoverUrl = await cropImage(coverUrl, verticalCrop);

    return [
      { originSrc: coverUrl, src: horizontalCoverUrl, cropParams: horizontalCrop, ratio: 1.5 },
      { originSrc: coverUrl, src: verticalCoverUrl, cropParams: verticalCrop, ratio: 0.75 },
    ];
  }

  // 获取图片实际尺寸
  async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => {
        console.error('获取图片尺寸失败:', url);
        resolve(null);
      };
      img.src = url;
    });
  }

  // 发布文章
  async function publishArticle(articleData: ArticleData): Promise<string | null> {
    console.log('开始发布文章:', articleData.title);

    if (articleData.images) {
      articleData.htmlContent = await processContent(articleData.htmlContent, articleData.images);
    }

    let coverResults: CoverResult[] | null = null;
    if (articleData.cover) {
      coverResults = await processCover(articleData.cover);
      if (!coverResults) {
        console.error('封面处理失败');
        return null;
      }
    }

    const formData = new FormData();
    formData.append('type', 'news');
    formData.append('title', articleData.title?.slice(0, 30) || '');
    formData.append('content', articleData.htmlContent || '');
    formData.append('vertical_cover', coverResults?.[1].src || '');
    formData.append('abstract', articleData.digest || '');

    const contentLength =
      new DOMParser().parseFromString(articleData.htmlContent || '', 'text/html').documentElement.textContent?.length ||
      0;

    formData.append('len', contentLength.toString());
    formData.append('activity_list[0][id]', 'ttv');
    formData.append('activity_list[0][is_checked]', '1');
    formData.append('activity_list[1][id]', 'reward');
    formData.append('activity_list[1][is_checked]', '1');
    formData.append('activity_list[2][id]', 'aigc_bjh_status');
    formData.append('activity_list[2][is_checked]', '0');
    formData.append('source_reprinted_allow', '0');
    formData.append('is_auto_optimize_cover', '1');
    formData.append('abstract_from', '1');
    formData.append('cover_layout', 'one');

    if (coverResults) {
      formData.append(
        'cover_images',
        JSON.stringify([
          {
            src: coverResults[0].src,
            cropData: {
              x: coverResults[0].cropParams.x,
              y: coverResults[0].cropParams.y,
              width: coverResults[0].cropParams.w,
              height: coverResults[0].cropParams.h,
            },
            machine_chooseimg: 0,
            isLegal: 0,
            cover_source_tag: 'local',
          },
        ]),
      );

      formData.append(
        '_cover_images_map',
        JSON.stringify([
          {
            src: coverResults[0].src,
            origin_src: coverResults[0].originSrc,
          },
        ]),
      );
    }

    formData.append('source', 'upload');
    formData.append('cover_source', 'upload');

    try {
      const response = await fetch('https://baijiahao.baidu.com/pcui/article/save?callback=bjhdraft', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          Token: getEditToken(),
        },
      });

      if (!response.ok) {
        throw new Error(`发布失败: ${response.status}`);
      }

      const result = await response.json();
      if (result.errno === 0) {
        console.log('文章发布成功，ID:', result.ret?.id);
        return result.ret?.id;
      } else {
        console.error('发布失败:', result.message);
        return null;
      }
    } catch (error) {
      console.error('发布过程出错:', error);
      return null;
    }
  }

  // 计算裁剪参数
  function calculateCropParams(width: number, height: number, ratio: number) {
    let w, h, x, y;
    if (width / height > ratio) {
      h = height;
      w = Math.floor(height * ratio);
      y = 0;
      x = Math.floor((width - w) / 2);
    } else {
      w = width;
      h = Math.floor(width / ratio);
      x = 0;
      y = Math.floor((height - h) / 2);
    }
    return { x, y, w, h };
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
        正在同步文章到百度百家号...
      </div>
    `;
    shadow.appendChild(tip);

    const articleId = await publishArticle(articleData);

    if (articleId) {
      (tip.querySelector('.float-tip') as HTMLDivElement).textContent = '文章同步成功！';

      setTimeout(() => {
        document.body.removeChild(host);
      }, 3000);

      if (!data.isAutoPublish) {
        window.location.href = `https://baijiahao.baidu.com/builder/rc/edit?type=news&article_id=${articleId}`;
      }
    }
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
