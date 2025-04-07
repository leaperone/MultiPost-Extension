import type { ArticleData, FileData, SyncData } from '~sync/common';

// 上传图片的配置接口
interface UploadConfig {
  token: string;
  key: string;
}

export async function ArticleJianshu(data: SyncData) {
  console.log('ArticleJianshu', data);

  const articleData = data.data as ArticleData;

  // 获取图片上传配置
  async function getUploadConfig(filename: string): Promise<UploadConfig> {
    const params = new URLSearchParams({ filename });
    const url = `https://www.jianshu.com/upload_images/token.json?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    return await response.json();
  }

  // 上传单个图片
  async function uploadImage(fileInfo: FileData): Promise<string | null> {
    console.log('uploadImage -->', fileInfo);

    const config = await getUploadConfig(fileInfo.name);
    console.log('uploadConfig -->', config);

    const response = await fetch(fileInfo.url);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('token', config.token);
    formData.append('key', config.key);
    formData.append('file', blob, fileInfo.name);
    formData.append('x:protocol', 'https');

    try {
      const uploadResponse = await fetch('https://upload.qiniup.com/', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }

      const result = await uploadResponse.json();
      console.log('Image upload result:', result);

      return result?.url || null;
    } catch (error) {
      console.log('Error uploading image:', error);
      return null;
    }
  }

  // 处理文章内容中的图片
  async function processContent(content: string, fileDatas: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const images = doc.getElementsByTagName('img');

    console.log('images -->', images);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = img.getAttribute('src');

      if (src) {
        console.log('try replace ', src);
        const fileInfo = fileDatas.find((f) => f.url === src);
        const newUrl = await uploadImage(fileInfo);
        if (newUrl) {
          img.setAttribute('src', newUrl);
        }
      }
    }

    return doc.body.innerHTML;
  }

  // 发布文章
  async function publishArticle(articleData: ArticleData): Promise<string | null> {
    // 获取笔记本列表
    const notebooksResponse = await fetch('https://www.jianshu.com/author/notebooks', {
      method: 'GET',
      credentials: 'include',
    });

    if (!notebooksResponse.ok) {
      console.error(`HTTP error! status: ${notebooksResponse.status}`);
      return null;
    }

    const notebooks = await notebooksResponse.json();
    console.log('Notebooks:', notebooks);

    const notebookId = notebooks[0]?.id || null;

    // 创建新文章
    const createResponse = await fetch('https://www.jianshu.com/author/notes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notebook_id: notebookId,
        title: articleData.title,
        at_bottom: false,
      }),
    });

    if (!createResponse.ok) {
      console.error(`HTTP error! status: ${createResponse.status}`);
      return null;
    }

    const createResult = await createResponse.json();
    console.log('result', createResult);

    const noteId = createResult.id;

    // 更新文章内容
    const updateResponse = await fetch(`https://www.jianshu.com/author/notes/${noteId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: noteId,
        autosave_control: 1,
        title: articleData.title,
        content: articleData.content,
      }),
    });

    if (!updateResponse.ok) {
      console.error(`HTTP error! status: ${updateResponse.status}`);
      return null;
    }

    const updateResult = await updateResponse.json();
    console.log('updateResult', updateResult);

    if (createResult.id) {
      console.log('草稿发布成功');
      return `https://www.jianshu.com/writer#/notebooks/${notebookId}/notes/${noteId}/writing`;
    } else {
      console.error('草稿发布失败', createResult.message);
      return null;
    }
  }

  // 主流程
  const processedData = articleData;
  processedData.content = await processContent(processedData.content, processedData.fileDatas);

  const publishUrl = await publishArticle(processedData);

  if (publishUrl) {
    if (!data.isAutoPublish) {
      window.location.href = publishUrl;
      window.location.reload();
    }
  }
}
