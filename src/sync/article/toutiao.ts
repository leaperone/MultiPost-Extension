import type { ArticleData, FileData, SyncData } from '~sync/common';

export async function ArticleToutiao(data: SyncData) {
  const articleData = data.data as ArticleData;
  console.log('message', data);
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

  async function processContent(content: string): Promise<void> {
    await waitForElement('div[contenteditable="true"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 处理标题
    const titleTextarea = document.querySelector('textarea[placeholder="请输入文章标题（2～30个字）"]');
    if (titleTextarea) {
      (titleTextarea as HTMLTextAreaElement).value = articleData.title?.slice(0, 30) || '';
      titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
    console.log('titleTextarea', titleTextarea);

    // 处理内容
    const editor = document.querySelector('div[contenteditable="true"]') as HTMLElement;
    if (!editor) {
      console.log('未找到编辑器元素');
      return;
    }

    editor.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/html', content || '');
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  async function processCover(coverData: FileData): Promise<void> {
    // 清除现有封面
    const clearExistingCovers = async () => {
      for (let i = 0; i < 20; i++) {
        const closeButton = document.querySelector('.article-cover-delete') as HTMLElement;
        if (!closeButton) break;
        console.log('Clicking close button', closeButton);
        closeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    };

    await clearExistingCovers();

    // 上传新封面
    const uploadButton = document.querySelector('div[class="article-cover-add"]');
    if (!uploadButton) return;

    console.log('Found upload image button');
    uploadButton.dispatchEvent(new Event('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 切换到上传图片标签
    const tabs = document.querySelectorAll('div.byte-tabs-header-title');
    const uploadTab = Array.from(tabs).find((tab) => tab.textContent?.includes('上传图片'));
    if (uploadTab) {
      uploadTab.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 上传文件
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) {
      console.log('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    console.log('try upload file', coverData);

    const response = await fetch(coverData.url);
    const buffer = await response.arrayBuffer();
    const file = new File([buffer], coverData.name, { type: coverData.type });
    dataTransfer.items.add(file);

    if (dataTransfer.files.length > 0) {
      (fileInput as HTMLInputElement).files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 确认上传
    const confirmButton = document.querySelector('button[data-e2e="imageUploadConfirm-btn"]');
    if (confirmButton) {
      console.log('Clicking confirm button for image upload');
      confirmButton.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 主流程
  try {
    await processContent(articleData.content);

    if (articleData.cover) {
      await processCover(articleData.cover);
    }

    // 发布或预览
    const buttons = document.querySelectorAll('button.publish-btn');
    const publishButton = Array.from(buttons).find((btn) => btn.textContent?.includes('预览并发布'));

    if (publishButton && data.isAutoPublish) {
      console.log('sendButton clicked');
      publishButton.dispatchEvent(new Event('click', { bubbles: true }));
    } else {
      console.log("未找到'发送'按钮");
    }
  } catch (error) {
    console.error('发布文章失败:', error);
    throw error;
  }
}
