import type { DynamicData, SyncData } from '../common';

export async function DynamicReddit(data: SyncData) {
  const { title, content, images, videos } = data.data as DynamicData;

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

  async function uploadFiles(files: File[], fileInput: HTMLInputElement) {
    // const fileInput = (await waitForElement(selector)) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.debug('文件上传操作完成');
  }

  // 辅助函数：等待多个元素出现

  try {
    const selectButton = (await waitForElement('#post-submit-community-picker', 5000)).shadowRoot.querySelector(
      '#dropdown-button',
    ) as HTMLButtonElement;
    selectButton.click();

    const community = (await waitForElement(
      '#post-submit-community-picker > li > ul > li:nth-child(1)',
      5000,
    )) as HTMLElement;
    community.click();

    const titleEditor = (await waitForElement(
      '#post-composer__title > faceplate-tracker > faceplate-textarea-input',
    )) as HTMLDivElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const titleInput = titleEditor.shadowRoot.querySelector('#innerTextArea') as HTMLTextAreaElement;
    // 聚焦编辑器
    titleInput.value = title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));

    // 填写内容
    const editorElement = (await waitForElement('div[name="body"][contenteditable="true"]')) as HTMLDivElement;
    if (!editorElement) {
      console.debug('未找到编辑器元素');
      return;
    }
    editorElement.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', content || '');
    editorElement.dispatchEvent(pasteEvent);
    editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    editorElement.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('编辑器内容已更新');

    // 处理图片上传
    if (images && images.length > 0) {
      const imageInput = document
        .querySelector('#post-composer_bodytext > shreddit-composer > rte-toolbar-button-image')
        .shadowRoot.querySelector('input') as HTMLInputElement;
      if (imageInput) {
        const imageFiles = await Promise.all(
          images.map(async (file) => {
            const response = await fetch(file.url);
            const blob = await response.blob();
            return new File([blob], file.name, { type: file.type });
          }),
        );
        await uploadFiles(imageFiles, imageInput);
      }
    }

    if (videos && videos.length > 0) {
      const videoInput = document
        .querySelector('#post-composer_bodytext > shreddit-composer > rte-toolbar-button-video')
        .shadowRoot.querySelector('input') as HTMLInputElement;
      if (videoInput) {
        const videoFiles = await Promise.all(
          videos.map(async (fileData) => {
            const response = await fetch(fileData.url);
            const blob = await response.arrayBuffer();
            return new File([blob], fileData.name, { type: fileData.type });
          }),
        );
        await uploadFiles(videoFiles, videoInput);
      }
    }

    console.debug('成功上传');

    // 等待一段时间后尝试提交
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 自动提交
    if (data.auto_publish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const submitButton = (await waitForElement('#submit-post-button', 5000)).shadowRoot.querySelector(
            '#inner-post-submit-button',
          ) as HTMLButtonElement;
          submitButton.click();
          console.log('提交按钮已点击');
          await new Promise((resolve) => setTimeout(resolve, 3000)); // 等待提交完成
          window.location.reload(); // 提交后刷新页面
          break; // 成功点击后退出循环
        } catch (error) {
          console.warn(`第 ${attempt + 1} 次尝试查找提交按钮失败:`, error);
          if (attempt === maxAttempts - 1) {
            console.error('达到最大尝试次数，无法找到提交按钮');
          }
          await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒后重试
        }
      }
    }
  } catch (error) {
    console.error('填入内容或上传图片或上传视频时出错:', error);
  }
}
