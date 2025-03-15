import { type DynamicData, type SyncData } from '../common';

interface WeixinUploadResult {
  fileId: number;
  url: string;
}

interface CropConfig {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export async function DynamicWeixin(data: SyncData) {
  // 从URL中提取token
  await new Promise((resolve) => setTimeout(resolve, 1000));

  async function readInfo(): Promise<{ token: string; nickname: string }> {
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

    if (!tokenMatch) {
      throw new Error('无法获取 token，请重新登录后重试');
    }

    const token = tokenMatch[1];
    const nickname = nicknameMatch ? nicknameMatch[1] : '';

    console.log('提取的数据:', { token, nickname });

    return { token, nickname };
  }

  const { token } = await readInfo();
  const dynamicData = data.data as DynamicData;

  // 计算裁剪配置
  function calculateCropConfig(ratio: number, width: number, height: number): CropConfig {
    let x1, y1, x2, y2;

    if (width / height > ratio) {
      // 图片太宽,需要裁剪两边
      const targetWidth = height * ratio;
      const cropPercent = (width - targetWidth) / 2 / width;
      x1 = cropPercent;
      y1 = 0;
      x2 = 1 - cropPercent;
      y2 = 1;
    } else {
      // 图片太高,需要裁剪上下
      const targetHeight = width / ratio;
      const cropPercent = (height - targetHeight) / 2 / height;
      x1 = 0;
      y1 = cropPercent;
      x2 = 1;
      y2 = 1 - cropPercent;
    }

    return { x1, y1, x2, y2 };
  }

  // 裁剪图片
  async function cropImage(image: WeixinUploadResult, config: CropConfig): Promise<WeixinUploadResult | null> {
    const formData = new FormData();
    formData.append('imgurl', image.url);
    formData.append('size_count', '1');
    formData.append('size0_x1', config.x1.toString());
    formData.append('size0_y1', config.y1.toString());
    formData.append('size0_x2', config.x2.toString());
    formData.append('size0_y2', config.y2.toString());
    formData.append('token', token);
    formData.append('lang', 'zh_CN');
    formData.append('f', 'json');
    formData.append('ajax', '1');

    const url = new URL('https://mp.weixin.qq.com/cgi-bin/cropimage');
    url.searchParams.set('action', 'crop_multi');
    url.searchParams.set('token', token);
    url.searchParams.set('lang', 'zh_CN');

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.base_resp.err_msg !== 'ok') return null;

    const cropResult = result.result[0];
    return {
      fileId: cropResult.file_id,
      url: cropResult.cdnurl,
    };
  }

  // 上传图片
  async function uploadImage(file: File): Promise<WeixinUploadResult | null> {
    const formData = new FormData();
    formData.append('type', file.type);
    formData.append('id', Date.now().toString());
    formData.append('name', `${Date.now()}.jpg`);
    formData.append('lastModifiedDate', new Date().toString());
    formData.append('size', file.size.toString());
    formData.append('file', file);

    const url = new URL('https://mp.weixin.qq.com/cgi-bin/filetransfer');
    url.searchParams.set('action', 'upload_material');
    url.searchParams.set('f', 'json');
    url.searchParams.set('scene', '5'); // 动态场景使用5
    url.searchParams.set('writetype', 'doublewrite');
    url.searchParams.set('groupid', '1');
    url.searchParams.set('token', token);
    url.searchParams.set('lang', 'zh_CN');

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.base_resp.err_msg !== 'ok') return null;

    return {
      fileId: parseInt(result.content, 10),
      url: result.cdn_url,
    };
  }

  // 创建动态
  async function createDynamic(content: string, images: WeixinUploadResult[]) {
    const formData = new FormData();
    const title = dynamicData.title || content?.trim().split('\n')[0].slice(0, 32) || '';

    // 基本信息
    formData.append('token', token);
    formData.append('lang', 'zh_CN');
    formData.append('f', 'json');
    formData.append('ajax', '1');
    formData.append('random', Math.random().toString());
    formData.append('AppMsgId', '');
    formData.append('count', '1');
    formData.append('data_seq', '0');
    formData.append('operate_from', 'Chrome');
    formData.append('isnew', '0');
    formData.append('autosave_log', 'true');
    formData.append('articlenum', '1');
    formData.append('pre_timesend_set', '0');
    formData.append('is_finder_video0', '0');
    formData.append('finder_draft_id0', '0');
    formData.append('applyori0', '0');
    formData.append('ad_video_transition0', '');
    formData.append('can_reward0', '0');
    formData.append('related_video0', '');
    formData.append('is_video_recommend0', '-1');
    formData.append('title0', title);
    formData.append('is_user_title0', '1');
    formData.append('author0', '');
    formData.append('writerid0', '0');
    formData.append('fileid0', '');
    formData.append('digest0', '');
    formData.append('auto_gen_digest0', '1');
    formData.append('content0', content);
    formData.append('sourceurl0', '');
    formData.append('need_open_comment0', '1');
    formData.append('only_fans_can_comment0', '0');
    formData.append('only_fans_days_can_comment0', '0');
    formData.append('reply_flag0', '2');
    formData.append('not_pay_can_comment0', '0');
    formData.append('auto_elect_comment0', '0');
    formData.append('auto_elect_reply0', '0');
    formData.append('open_fansmsg0', '0');

    // 图片信息
    const imageInfos = images.map((img) => ({
      url: img.url,
      file_id: img.fileId,
      cdn_url: img.url,
    }));

    formData.append('share_imageinfo0', JSON.stringify({ list: imageInfos }));
    formData.append('share_page_type0', images.length > 0 ? '8' : '0');

    // 其他必要参数
    formData.append('music_id0', '');
    formData.append('video_id0', '');
    formData.append('voteid0', '');
    formData.append('voteismlt0', '');
    formData.append('supervoteid0', '');
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
    formData.append('guide_words0', content);
    formData.append('is_share_copyright0', '0');
    formData.append('share_copyright_url0', '');
    formData.append('source_article_type0', '');
    formData.append('reprint_recommend_title0', '');
    formData.append('reprint_recommend_content0', '');
    formData.append('share_video_id0', '');
    formData.append('dot0', '{}');
    formData.append('share_voice_id0', '');
    formData.append('insert_ad_mode0', '');
    formData.append('categories_list0', '[]');
    formData.append('compose_info0', '{"list":""}');
    formData.append('is_pay_subscribe0', '0');
    formData.append('pay_fee0', '');
    formData.append('pay_preview_percent0', '');
    formData.append('pay_desc0', '');
    formData.append('pay_album_info0', '');
    formData.append('appmsg_album_info0', '{"appmsg_album_infos":[]}');
    formData.append('open_keyword_ad0', '1');
    formData.append('audio_info0', '');
    formData.append('danmu_pub_type0_0', '0');
    formData.append('mp_video_info0', '{"list":[]}');
    formData.append('is_set_sync_to_finder0', '0');
    formData.append('sync_to_finder_cover0', '');
    formData.append('sync_to_finder_cover_source0', '');
    formData.append('import_to_finder0', '0');
    formData.append('import_from_finder_export_id0', '');
    formData.append('style_type0', '3');
    formData.append('sticker_info0', '{}');
    formData.append('new_pic_process0', '1');
    formData.append('disable_recommend0', '0');
    formData.append('claim_source_type0', '');
    formData.append('msg_index_id0', '');
    formData.append('convert_to_image_share_page0', '');
    formData.append('convert_from_image_share_page0', '');
    formData.append('multi_picture_cover0', '0');
    formData.append('is_auto_type_setting', '3');
    formData.append('save_type', '1');
    formData.append('isneedsave', '0');

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
    return result?.appMsgId;
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
        正在同步动态到微信公众号...
      </div>
    `;
    shadow.appendChild(tip);

    console.log('herf', window.location.href);

    // 上传图片
    const uploadedImages: WeixinUploadResult[] = [];
    const ratios = [16 / 9, 1, 3 / 4]; // 支持的裁剪比例

    for (const fileData of dynamicData.images) {
      const file = await fetch(fileData.url).then((r) => r.blob());
      const uploadResult = await uploadImage(new File([file], fileData.name, { type: fileData.type }));

      if (uploadResult) {
        // 获取图片实际尺寸
        const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.onload = () => {
            resolve({
              width: img.width,
              height: img.height,
            });
            URL.revokeObjectURL(objectUrl); // 清理URL对象
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl); // 清理URL对象
            reject(new Error('获取图片尺寸失败'));
          };
          img.src = objectUrl;
        });

        // 对每个上传的图片进行裁剪
        const cropConfigs = ratios.map((ratio) =>
          calculateCropConfig(ratio, imageDimensions.width, imageDimensions.height),
        );
        const croppedImages = await Promise.all(cropConfigs.map((config) => cropImage(uploadResult, config)));

        // 使用第一个成功裁剪的图片
        const croppedImage = croppedImages.find((img) => img !== null);
        if (croppedImage) {
          uploadedImages.push(croppedImage);
        } else {
          uploadedImages.push(uploadResult);
        }
      }
    }

    // 创建动态
    const appMsgId = await createDynamic(dynamicData.content || '', uploadedImages);
    if (!appMsgId) {
      throw new Error('创建动态失败');
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
    (tip.querySelector('.float-tip') as HTMLDivElement).textContent = '动态同步成功！';

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

    console.error('发布动态失败:', error);
    throw error;
  }
}
