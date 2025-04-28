import type { ArticleData, SyncData } from '~sync/common';

export async function ArticleSSPai(data: SyncData) {
  console.debug('ArticleSSPai', data);

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

  async function findElementByText(
    selector: string,
    text: string,
    maxRetries = 5,
    retryInterval = 1000,
  ): Promise<Element | null> {
    for (let i = 0; i < maxRetries; i++) {
      const elements = document.querySelectorAll(selector);
      const element = Array.from(elements).find((element) => element.textContent?.includes(text));

      if (element) {
        return element;
      }

      console.log(`未找到包含文本 "${text}" 的元素，尝试次数：${i + 1}`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    console.error(`在 ${maxRetries} 次尝试后未找到包含文本 "${text}" 的元素`);
    return null;
  }

  const articleData = data.origin as ArticleData;

  // 上传封面图片
  async function uploadCoverImage() {
    // 检查是否有封面图片
    if (!articleData.cover) {
      console.debug('没有封面图片需要上传');
      return true;
    }

    try {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (!fileInput) {
        console.debug('未找到文件上传输入框');
        return false;
      }

      const dataTransfer = new DataTransfer();
      const coverImage = articleData.cover;

      console.debug('开始上传文件', coverImage);

      // 从blob URL获取文件内容并创建File对象
      const response = await fetch(coverImage.url);
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], coverImage.name, { type: coverImage.type });

      // 添加文件到DataTransfer对象
      dataTransfer.items.add(file);
      console.debug('文件已准备');

      if (dataTransfer.files.length > 0) {
        // 设置文件输入框的files属性并触发change事件
        fileInput.files = dataTransfer.files;
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        console.debug('文件上传操作完成');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const cutAndUseButtonSpan = await findElementByText('span', '裁切并使用');
      if (cutAndUseButtonSpan) {
        const cutAndUseButton = cutAndUseButtonSpan.parentElement;
        if (cutAndUseButton) {
          const clickEvent = new Event('click', { bubbles: true });
          cutAndUseButton.dispatchEvent(clickEvent);
        }
      }

      return true;
    } catch (error) {
      console.error('上传封面图片失败:', error);
      return false;
    }
  }

  // 填充文章内容
  async function fillArticleContent() {
    // 等待标题输入框出现
    const titleTextarea = (await waitForElement('textarea[placeholder="请输入标题..."]')) as HTMLTextAreaElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 设置标题
    titleTextarea.value = articleData.title?.slice(0, 100) || '';
    titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    console.debug('titleTextarea', titleTextarea, titleTextarea.value);

    // 等待编辑器加载
    const editorDiv = (await waitForElement('div[contenteditable="true"]')) as HTMLDivElement;
    if (!editorDiv) {
      console.debug('未找到编辑器元素');
      return false;
    }

    const editor = editorDiv.querySelector('p') as HTMLParagraphElement;
    if (!editor) {
      console.debug('未找到编辑器元素');
      return false;
    }

    // 填充内容
    editor.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', articleData.markdownContent || '');
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const convertButtonSpan = await findElementByText('span', '立即转换');
    if (convertButtonSpan) {
      const convertButton = convertButtonSpan.parentElement;
      if (convertButton) {
        const clickEvent = new Event('click', { bubbles: true });
        convertButton.dispatchEvent(clickEvent);
      }
    }
    return true;
  }

  // 发布文章
  async function publishArticle(): Promise<void> {
    if (data.isAutoPublish) {
      const publishButton = await findElementByText('button', '发布');
      if (publishButton) {
        const clickEvent = new Event('click', { bubbles: true });
        publishButton.dispatchEvent(clickEvent);
      }
      return;
    }

    const previewButton = await findElementByText('button', '预览');
    console.debug('previewButton', previewButton);

    if (previewButton) {
      console.debug('previewButton clicked');
      const clickEvent = new Event('click', { bubbles: true });
      previewButton.dispatchEvent(clickEvent);
    } else {
      console.debug('未找到"预览"按钮');
    }
  }

  // 主流程
  try {
    // 上传封面图片
    await uploadCoverImage();

    const contentFilled = await fillArticleContent();
    if (!contentFilled) {
      throw new Error('填充文章内容失败');
    }

    await publishArticle();
  } catch (error) {
    console.error('发布文章失败:', error);
  }
}
