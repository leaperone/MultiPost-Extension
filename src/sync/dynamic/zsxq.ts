import type { DynamicData, SyncData } from '../common';

export async function DynamicZSXQ(data: SyncData) {
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

  const { title, content, images } = data.data as DynamicData;

  const postContent = title ? `${title}\n${content}` : content;

  try {
    // 等待帖子头部元素
    const postTopicHead = (await waitForElement('.post-topic-head')) as HTMLElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 点击发帖按钮
    console.debug('postTopicHead', postTopicHead);
    if (!postTopicHead) {
      console.debug('未找到帖子头部元素');
      return;
    }

    postTopicHead.click();
    const clickEvent = new Event('click', { bubbles: true });
    postTopicHead.dispatchEvent(clickEvent);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 找到编辑器并填写内容
    const editor = document.querySelector('.ql-editor') as HTMLElement;
    console.debug('editor', editor);
    if (!editor) {
      console.debug('未找到编辑器元素');
      return;
    }

    editor.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, 500));
    editor.focus();

    // 粘贴内容
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', postContent || '');
    editor.dispatchEvent(pasteEvent);
    await new Promise((resolve) => setTimeout(resolve, 100));
    editor.blur();
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.debug('editor-->', editor, editor.textContent);

    // 处理图片上传
    if (images && images.length > 0) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      console.debug('fileInput', fileInput);
      if (!fileInput) {
        console.debug('未找到文件输入元素');
        return;
      }

      const dataTransfer = new DataTransfer();
      for (const image of images) {
        if (!image.type.startsWith('image/')) continue;

        console.debug('try upload file', image);
        const response = await fetch(image.url);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], image.name, { type: image.type });
        dataTransfer.items.add(file);
        console.debug('uploaded');
      }

      if (dataTransfer.files.length > 0) {
        fileInput.files = dataTransfer.files;
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        const inputEvent = new Event('input', { bubbles: true });
        fileInput.dispatchEvent(inputEvent);
        console.debug('文件上传操作完成');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // 发布内容
    const submitButtons = document.querySelectorAll('.submit-btn');
    const publishButton = Array.from(submitButtons).find((el) => el.textContent?.includes('发布'));
    console.debug('publishButton', publishButton);

    if (publishButton && data.isAutoPublish) {
      console.debug('publishButton clicked');
      const clickEvent = new Event('click', { bubbles: true });
      publishButton.dispatchEvent(clickEvent);
    } else {
      console.debug('未找到"发布"按钮');
    }
  } catch (error) {
    console.error('发布内容时出错:', error);
  }
}
