import type { ArticleData, SyncData } from '~sync/common';

interface WeixinUploadResult {
  fileId: number;
  url: string;
}

interface CropedImage {
  url: string;
  fileId: number;
  height: number;
  width: number;
  ratio?: string;
}

interface CropConfig {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x1_abs: number;
  y1_abs: number;
  x2_abs: number;
  y2_abs: number;
}

interface ShareImageInfo {
  url: string;
  fileId: number;
  height: number;
  width: number;
}

export async function ArticleWeixin(data: SyncData) {
  // 从URL中提取token
  await new Promise((resolve) => setTimeout(resolve, 1000));

  async function readInfo(): Promise<{ token: string; nickname: string; ticket: string; userName: string }> {
    const response = await fetch('https://mp.weixin.qq.com/');
    const html = await response.text();

    // 提取整个 window.wx.commonData 对象
    const dataMatch = html.match(/window\.wx\.commonData\s*=\s*\{([\s\S]*?)\};/);
    if (!dataMatch) {
      throw new Error('无法获取微信公众号信息');
    }

    // 提取 token 和 nickname
    const tokenMatch = dataMatch[1].match(/t:\s*["'](\d+)["']/);
    const nicknameMatch = dataMatch[1].match(/nick_name:\s*["']([^"']+)["']/);
    const ticketMatch = dataMatch[1].match(/ticket:\s*["']([^"']+)["']/);
    const userNameMatch = dataMatch[1].match(/user_name:\s*["']([^"']+)["']/);

    if (!tokenMatch) {
      throw new Error('无法获取 token，请重新登录后重试');
    }

    const token = tokenMatch[1];
    const nickname = nicknameMatch ? nicknameMatch[1] : '';
    const ticket = ticketMatch ? ticketMatch[1] : '';
    const userName = userNameMatch ? userNameMatch[1] : '';

    console.log('提取的数据:', { token, nickname, ticket, userName });

    return { token, nickname, ticket, userName };
  }

  const { token, nickname, ticket, userName } = await readInfo();

  const articleData = data.data as ArticleData;

  // 获取图片尺寸和内容
  async function getImageInfo(url: string): Promise<{ width: number; height: number; blob: Blob }> {
    // 直接使用 fetch 获取图片
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('获取图片失败');
    }
    const blob = await response.blob();

    // 创建一个 URL 来获取图片尺寸
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          blob,
        });
        URL.revokeObjectURL(objectUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('获取图片尺寸失败'));
      };

      img.src = objectUrl;
    });
  }

  // 计算图片裁剪配置
  function calculateCropConfig(ratio: number, width: number, height: number): CropConfig {
    let x1, y1, x2, y2, x1_abs, y1_abs, x2_abs, y2_abs;

    if (width / height > ratio) {
      // 图片太宽,需要裁剪两边
      const targetWidth = height * ratio;
      const cropPercent = (width - targetWidth) / 2 / width;
      x1 = cropPercent;
      y1 = 0;
      x2 = 1 - cropPercent;
      y2 = 1;
      x1_abs = Math.round(x1 * width);
      y1_abs = Math.round(y1 * height);
      x2_abs = Math.round(x2 * width);
      y2_abs = Math.round(y2 * height);
    } else {
      // 图片太高,需要裁剪上下
      const targetHeight = width / ratio;
      const cropPercent = (height - targetHeight) / 2 / height;
      x1 = 0;
      y1 = cropPercent;
      x2 = 1;
      y2 = 1 - cropPercent;
      x1_abs = Math.round(x1 * width);
      y1_abs = Math.round(y1 * height);
      x2_abs = Math.round(x2 * width);
      y2_abs = Math.round(y2 * height);
    }

    const config = {
      x1,
      y1,
      x2,
      y2,
      x1_abs,
      y1_abs,
      x2_abs,
      y2_abs,
    };

    console.debug('calculateCropConfig config -->', ratio, config);
    return config;
  }

  // 上传图片
  async function uploadImage(file: { url: string }, scene: number = 8): Promise<WeixinUploadResult | null> {
    const formData = new FormData();

    // 获取文件blob
    const blob = await (await fetch(file.url)).blob();
    console.debug('uploadImage file -->', file, blob);

    // 构建表单数据
    formData.append('type', blob.type);
    formData.append('id', Date.now().toString());
    formData.append('name', `${Date.now()}.jpg`);
    formData.append('lastModifiedDate', new Date().toString());
    formData.append('size', blob.size.toString());
    formData.append('file', blob, `${Date.now()}.jpg`);

    // 构建URL参数
    const url = new URL('https://mp.weixin.qq.com/cgi-bin/filetransfer');
    const timestamp = Math.floor(Date.now() / 1000);
    const seq = Date.now().toString();

    url.searchParams.append('action', 'upload_material');
    url.searchParams.append('f', 'json');
    url.searchParams.append('scene', scene.toString());
    url.searchParams.append('writetype', 'doublewrite');
    url.searchParams.append('groupid', '1');
    url.searchParams.append('ticket_id', userName);
    url.searchParams.append('ticket', ticket);
    url.searchParams.append('svr_time', timestamp.toString());
    url.searchParams.append('token', token);
    url.searchParams.append('lang', 'zh_CN');
    url.searchParams.append('seq', seq);
    url.searchParams.append('t', Math.random().toString());

    console.debug('uploadImage url -->', url, url.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.debug('uploadImage res -->', result);

    if (result.base_resp.err_msg !== 'ok') return null;

    return {
      fileId: parseInt(result.content, 10),
      url: result.cdn_url,
    };
  }

  // 裁剪图片
  async function cropImage(image: WeixinUploadResult, cropConfigs: CropConfig[]): Promise<CropedImage[]> {
    const formData = new FormData();
    formData.append('imgurl', image.url);
    formData.append('size_count', cropConfigs.length.toString());

    cropConfigs.forEach((config, index) => {
      formData.append(`size${index}_x1`, config.x1.toString());
      formData.append(`size${index}_y1`, config.y1.toString());
      formData.append(`size${index}_x2`, config.x2.toString());
      formData.append(`size${index}_y2`, config.y2.toString());
    });

    formData.append('token', token);
    formData.append('lang', 'zh_CN');
    formData.append('f', 'json');
    formData.append('ajax', '1');

    const response = await fetch('https://mp.weixin.qq.com/cgi-bin/cropimage?action=crop_multi', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.base_resp.err_msg !== 'ok') return null;

    return result.result.map((item) => ({
      url: item.cdnurl,
      fileId: item.file_id,
      height: item.height,
      width: item.width,
    }));
  }

  // 创建文章
  async function createArticle(
    content: string,
    cropedImages: CropedImage[],
    shareImageInfo: ShareImageInfo[] = [],
    onError?: (msg: string) => void,
  ) {
    const formData = new FormData();

    // 基本信息
    formData.append('token', token);
    formData.append('lang', 'zh_CN');
    formData.append('f', 'json');
    formData.append('ajax', '1');
    formData.append('random', Math.random().toString());

    // 必要的参数
    formData.append('AppMsgId', '');
    formData.append('count', '1');
    formData.append('data_seq', '0');
    formData.append('operate_from', 'Chrome');
    formData.append('isnew', '0');
    formData.append('ad_video_transition0', '');
    formData.append('can_reward0', '0');
    formData.append('related_video0', '');
    formData.append('is_video_recommend0', '-1');

    // 文章信息
    formData.append('title0', articleData.title || '');
    formData.append('author0', nickname || '');
    formData.append('writerid0', '0');
    formData.append('fileid0', '');
    formData.append('digest0', articleData.digest?.slice(0, 120) || '');
    formData.append('auto_gen_digest0', '1');
    formData.append('content0', content || '');
    formData.append('sourceurl0', '');
    formData.append('need_open_comment0', '1');
    formData.append('only_fans_can_comment0', '0');

    // 封面图片配置
    const defaultImage = cropedImages.find((img) => img.ratio === '2.35:1' || img.ratio === '1:1')?.url || '';
    formData.append('cdn_url0', defaultImage);
    formData.append('cdn_235_1_url0', defaultImage);
    formData.append('cdn_16_9_url0', cropedImages.find((img) => img.ratio === '16:9')?.url || '');
    formData.append('cdn_3_4_url0', cropedImages.find((img) => img.ratio === '3:4')?.url || '');
    formData.append('cdn_1_1_url0', cropedImages.find((img) => img.ratio === '1:1')?.url || '');
    formData.append('cdn_url_back0', cropedImages.find((img) => img.ratio === '1:1')?.url || '');

    // 裁剪配置
    const cropList = [
      {
        ratio: '16_9',
        x1: 0,
        y1: 453,
        x2: 1178,
        y2: 1116,
        file_id: cropedImages.find((img) => img.ratio === '16:9')?.fileId,
      },
      {
        ratio: '1_1',
        x1: 0,
        y1: 195,
        x2: 1178,
        y2: 1374,
        file_id: cropedImages.find((img) => img.ratio === '1:1')?.fileId,
      },
      {
        ratio: '3_4',
        x1: 0,
        y1: 0,
        x2: 1177,
        y2: 1570,
        file_id: cropedImages.find((img) => img.ratio === '3:4')?.fileId,
      },
    ];

    const cropListPercent = [
      {
        ratio: '16_9',
        x1: 0,
        y1: 0.28897292993630574,
        x2: 1,
        y2: 0.7110270700636943,
        file_id: cropedImages.find((img) => img.ratio === '16:9')?.fileId,
      },
      {
        ratio: '1_1',
        x1: 0,
        y1: 0.12484076433121016,
        x2: 1,
        y2: 0.8751592356687898,
        file_id: cropedImages.find((img) => img.ratio === '1:1')?.fileId,
      },
      {
        ratio: '3_4',
        x1: 21222410865878727e-20,
        y1: 0,
        x2: 0.9997877758913412,
        y2: 1,
        file_id: cropedImages.find((img) => img.ratio === '3:4')?.fileId,
      },
    ];

    formData.append(
      'crop_list0',
      JSON.stringify({
        crop_list: cropList,
        crop_list_percent: cropListPercent,
      }),
    );

    // 其他必要参数
    formData.append('music_id0', '');
    formData.append('video_id0', '');
    formData.append('voteid0', '');
    formData.append('voteismlt0', '');
    formData.append('supervoteid0', '');
    formData.append('cardid0', '');
    formData.append('cardquantity0', '');
    formData.append('cardlimit0', '');
    formData.append('vid_type0', '');
    formData.append('show_cover_pic0', '0');
    formData.append('shortvideofileid0', '');
    formData.append('copyright_type0', '0');
    formData.append('releasefirst0', '');
    formData.append('platform0', '');
    formData.append('reprint_permit_type0', '');
    formData.append('allow_reprint0', '');
    formData.append('allow_reprint_modify0', '');
    formData.append('original_article_type0', '');
    formData.append('ori_white_list0', '');
    formData.append('free_content0', '');
    formData.append('fee0', '0');
    formData.append('ad_id0', '');
    formData.append('guide_words0', '');
    formData.append('is_share_copyright0', '0');
    formData.append('share_copyright_url0', '');
    formData.append('source_article_type0', '');
    formData.append('reprint_recommend_title0', '');
    formData.append('reprint_recommend_content0', '');
    formData.append('share_page_type0', shareImageInfo?.length > 0 ? '8' : '0');
    formData.append('share_imageinfo0', JSON.stringify({ list: shareImageInfo }));
    formData.append('share_video_id0', '');
    formData.append('dot0', '{}');
    formData.append('share_voice_id0', '');
    formData.append('insert_ad_mode0', '');
    formData.append('categories_list0', '[]');
    formData.append('compose_info0', '{"list":""}');

    const url = new URL('https://mp.weixin.qq.com/cgi-bin/operate_appmsg');
    url.searchParams.set('t', 'ajax-response');
    url.searchParams.set('sub', 'create');
    url.searchParams.set('type', '77');
    url.searchParams.set('token', token);
    url.searchParams.set('lang', 'zh_CN');

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!result?.appMsgId) {
      if (result?.base_resp?.err_msg) {
        if (onError) onError(result.base_resp.err_msg);
      }
      return null;
    }

    return result.appMsgId;
  }

  async function processContent(content: string, updateProgress: (msg: string) => void): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const images = doc.getElementsByTagName('img');

    console.debug('images -->', images);

    for (let i = 0; i < images.length; i++) {
      updateProgress(`开始上传 ${i + 1}/${images.length} 张图片`);
      const img = images[i];
      const src = img.getAttribute('src');
      if (src) {
        console.debug('try replace ', src);
        const result = await uploadImage({ url: src });
        if (result) {
          img.setAttribute('src', result.url);
        }
      }
    }

    return doc.body.innerHTML;
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
        正在同步文章到微信公众号...
      </div>
    `;
    shadow.appendChild(tip);

    console.log('herf', window.location.href);
    console.log('articleData', articleData);

    // 处理文章内容中的图片
    const updateProgress = (msg: string) => {
      const floatTip = tip.querySelector('.float-tip') as HTMLDivElement;
      if (floatTip) {
        floatTip.textContent = msg;
      }
    };

    const processedContent = await processContent(articleData.htmlContent, updateProgress);

    // 上传封面图片
    if (!articleData.cover) {
      throw new Error('需要封面图片');
    }

    // 获取图片信息
    const { width, height } = await getImageInfo(articleData.cover.url);

    const uploadResult = await uploadImage({ url: articleData.cover.url }, 8);
    if (!uploadResult) {
      throw new Error('封面图片上传失败');
    }

    // 裁剪封面图片
    const ratios = [16 / 9, 1, 3 / 4];
    const cropConfigs = ratios.map((ratio) => calculateCropConfig(ratio, width, height));

    const cropedImages = await cropImage(uploadResult, cropConfigs);
    if (!cropedImages) {
      throw new Error('封面图片裁剪失败');
    }

    // 为裁剪后的图片添加比例信息
    cropedImages.forEach((img, index) => {
      img.ratio = ['16:9', '1:1', '3:4'][index];
    });

    // 创建文章
    const appMsgId = await createArticle(processedContent, cropedImages, [], (msg) => {
      if (document.body.contains(host)) {
        const floatTip = tip.querySelector('.float-tip') as HTMLDivElement;
        floatTip.textContent = msg;
        floatTip.style.backgroundColor = '#dc2626';

        setTimeout(() => {
          document.body.removeChild(host);
        }, 3000);
      }
    });
    if (!appMsgId) {
      throw new Error('创建文章失败');
    }

    // 跳转到编辑页
    const editUrl = new URL('https://mp.weixin.qq.com/cgi-bin/appmsg');
    editUrl.searchParams.set('t', 'media/appmsg_edit');
    editUrl.searchParams.set('action', 'edit');
    editUrl.searchParams.set('type', '77');
    editUrl.searchParams.set('appmsgid', appMsgId);
    editUrl.searchParams.set('token', token);
    editUrl.searchParams.set('lang', 'zh_CN');

    window.location.href = editUrl.toString();

    // 发布成功后更新提示
    (tip.querySelector('.float-tip') as HTMLDivElement).textContent = '文章同步成功！';

    // 3秒后移除提示
    setTimeout(() => {
      document.body.removeChild(host);
    }, 3000);
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
