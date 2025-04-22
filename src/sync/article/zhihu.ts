import type { ArticleData, SyncData } from '~sync/common';

export async function ArticleZhihu(data: SyncData) {
  console.debug('ArticleZhihu', data);

  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  const articleData = data.origin as ArticleData;
  const processedData = data.data as ArticleData;

  // 处理文章内容中的图片
  async function processContent(content: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    // 知乎文章编辑器会自动处理图片上传，所以这里不需要预处理图片
    return doc.body.innerHTML;
  }

  // 填充文章内容
  async function fillArticleContent() {
    // 等待标题输入框出现
    const titleTextarea = (await waitForElement(
      'textarea[placeholder="请输入标题（最多 100 个字）"]',
    )) as HTMLTextAreaElement;
    if (!titleTextarea) {
      console.debug('未找到标题输入框');
      return false;
    }

    // 设置标题
    titleTextarea.value = articleData.title?.slice(0, 100) || '';
    titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    console.debug('titleTextarea', titleTextarea, titleTextarea.value);

    // 等待编辑器加载
    const editor = (await waitForElement('div[data-contents="true"]')) as HTMLDivElement;
    if (!editor) {
      console.debug('未找到编辑器元素');
      return false;
    }

    // 处理并填充内容
    const processedContent = await processContent(articleData.htmlContent);
    editor.focus();

    // 使用粘贴事件插入内容
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/html', processedContent);
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 5000));
    return true;
  }

  // 上传封面图片
  async function uploadCover() {
    if (!articleData.cover) return true;

    const fileInput = (await waitForElement('input[type="file"].UploadPicture-input')) as HTMLInputElement;
    if (!fileInput) {
      console.debug('未找到文件输入元素');
      return false;
    }

    try {
      const coverFile = processedData.cover;
      const dataTransfer = new DataTransfer();
      console.debug('try upload file', coverFile);

      const response = await fetch(coverFile.url);
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], coverFile.name, { type: coverFile.type });

      dataTransfer.items.add(file);
      console.debug('uploaded');

      if (dataTransfer.files.length > 0) {
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.debug('文件上传操作完成');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      return true;
    } catch (error) {
      console.error('上传封面图片失败:', error);
      return false;
    }
  }

  // 发布文章
  async function publishArticle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const buttons = document.querySelectorAll('button');
    const publishButton = Array.from(buttons).find((button) => button.textContent?.includes('发布'));

    console.debug('publishButton', publishButton);

    if (!publishButton) {
      console.debug('未找到"发布"按钮');
      return;
    }

    if (data.isAutoPublish) {
      console.debug('publishButton clicked');
      publishButton.dispatchEvent(new Event('click', { bubbles: true }));
    }
  }

  // 主流程
  try {
    const contentFilled = await fillArticleContent();
    if (!contentFilled) {
      throw new Error('填充文章内容失败');
    }

    const coverUploaded = await uploadCover();
    if (!coverUploaded) {
      throw new Error('上传封面图片失败');
    }

    await publishArticle();
  } catch (error) {
    console.error('发布文章失败:', error);
  }
}
