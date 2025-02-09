import type { ArticleData, FileData, SyncData } from '~sync/common';
import { v4 as uuidv4 } from 'uuid';

interface UploadConfig {
  filePath: string;
  policy: string;
  accessId: string;
  signature: string;
  callbackUrl: string;
  callbackBody: string;
  callbackBodyType: string;
  customParam: {
    rtype: string;
    watermark: string;
    templateName: string;
    filePath: string;
    isAudit: boolean;
    'x-image-app': string;
    type: string;
    'x-image-suffix': string;
    username: string;
  };
}

export async function ArticleCSDN(data: SyncData) {
  const articleData = data.data as ArticleData;

  // 使用浏览器原生 crypto API 的 signCSDN 函数
  async function signCSDN({
    method,
    accept,
    contentType,
    caKey,
    nonce,
    apiPath,
    hmac,
  }: {
    method: string;
    accept: string;
    contentType: string;
    caKey: string;
    nonce: string;
    apiPath: string;
    hmac: string;
  }): Promise<string> {
    const signContent = `${method}\n${accept}\n\n${contentType}\n\nx-ca-key:${caKey}\nx-ca-nonce:${nonce}\n${apiPath}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signContent);
    const keyData = encoder.encode(hmac);

    // 创建密钥
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

    // 生成签名
    const signature = await crypto.subtle.sign('HMAC', key, data);

    // 转换为 Base64
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  // 获取图片上传配置
  async function getUploadConfig(): Promise<UploadConfig> {
    const params = new URLSearchParams({
      type: 'blog',
      rtype: 'blog_picture',
      'x-image-template': 'standard',
      'x-image-app': 'direct_blog',
      'x-image-dir': 'direct',
      'x-image-suffix': 'png',
    });

    const url = `https://imgservice.csdn.net/direct/v1.0/image/obs/upload?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    return result.data;
  }

  // 上传单个图片
  async function uploadSingleImage(fileInfo: FileData): Promise<string | null> {
    const config = await getUploadConfig();
    const response = await fetch(fileInfo.url);
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

    try {
      const uploadResponse = await fetch('https://csdn-img-blog.obs.cn-north-4.myhuaweicloud.com/', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }

      const result = await uploadResponse.json();
      return result?.data?.imageUrl || null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  // 处理文章内容中的图片
  async function processContent(content: string, fileDatas: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const images = doc.getElementsByTagName('img');

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = img.getAttribute('src');
      if (src) {
        const fileInfo = fileDatas.find((f) => f.url === src);
        if (fileInfo) {
          const newUrl = await uploadSingleImage(fileInfo);
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
    if (articleData.fileDatas) {
      articleData.content = await processContent(articleData.content, articleData.fileDatas);
    }

    const coverUrl = articleData.cover ? await uploadSingleImage(articleData.cover) : '';

    const apiPath = '/blog-console-api/v1/postedit/saveArticle';
    const caKey = '203803574';
    const nonce = uuidv4();

    const signature = await signCSDN({
      method: 'POST',
      accept: '*/*',
      contentType: 'application/json',
      caKey,
      nonce,
      apiPath,
      hmac: '9znpamsyl2c7cdrr9sas0le9vbc3r6ba',
    });

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
      body: JSON.stringify({
        article_id: '',
        title: articleData.title?.slice(0, 100),
        description: articleData.digest?.slice(0, 256),
        content: articleData.content,
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
      }),
    });

    const result = await response.json();
    return result.code === 200 ? result.data.article_id : null;
  }

  // 主流程
  const articleId = await publishArticle(articleData);
  if (articleId) {
    if (!data.auto_publish) {
      window.location.href = `https://mp.csdn.net/mp_blog/creation/editor/${articleId}`;
    }
  }
}
