import { type DynamicData, type SyncData } from '../common';

// 不支持发布视频
export async function DynamicBaijiahao(data: SyncData) {
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

  try {
    const { content, images, title } = data.data as DynamicData;

    // 等待编辑器出现并输入内容
    await waitForElement('textarea#content');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 更新编辑器内容
    const editor = document.querySelector('textarea#content') as HTMLTextAreaElement;
    if (editor) {
      const combinedContent = title ? `${title}\n\n${content || ''}` : content || '';
      editor.value = combinedContent;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
      console.debug('titleTextarea', editor, editor?.value, combinedContent);
    }

    // 处理图片上传
    if (images.length > 0) {
      const uploadButton = document.querySelector('div.uploader-plus') as HTMLElement;
      if (uploadButton) {
        console.debug('Found upload image button', uploadButton);
        uploadButton.dispatchEvent(new Event('click', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 切换到本地图片标签
        const tabs = document.querySelectorAll('div.cheetah-tabs-tab-btn');
        const localImageTab = Array.from(tabs).find((tab) => tab.textContent?.includes('本地图片'));

        console.debug('uploadImageTab', localImageTab);
        if (localImageTab) {
          localImageTab.dispatchEvent(new Event('click', { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // 处理文件上传
        const fileInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
        console.debug('fileInput', fileInput);

        if (!fileInput) {
          console.debug('未找到文件输入元素');
          return;
        }

        const dataTransfer = new DataTransfer();

        for (const image of images) {
          if (!image.type.startsWith('image/')) {
            console.debug('Skipping non-image file:', image);
            continue;
          }

          console.debug('try upload file', image);
          const response = await fetch(image.url);
          const arrayBuffer = await response.arrayBuffer();
          const file = new File([arrayBuffer], image.name, { type: image.type });
          dataTransfer.items.add(file);
          console.debug('uploaded');
        }

        if (dataTransfer.files.length > 0) {
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.debug('文件上传操作完成');
        }

        // 等待上传完成
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 点击确认按钮
        const confirmButtons = document.querySelectorAll('button.cheetah-public');
        const confirmButton = Array.from(confirmButtons).find((button) => button.textContent?.includes('确认'));

        console.debug('confirmButton', confirmButton);
        if (confirmButton) {
          console.debug('Clicking confirm button for image upload');
          confirmButton.dispatchEvent(new Event('click', { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.debug('未找到图片上传确认按钮');
        }
      }
    }

    // 发布内容
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const publishButton = document.querySelector('button.events-op-bar-pub-btn-blue') as HTMLButtonElement;

    if (publishButton) {
      if (data.isAutoPublish) {
        console.debug('点击发布按钮');
        publishButton.click();
      }
    } else {
      console.debug('未找到发布按钮');
    }
  } catch (error) {
    console.error('百家号发布过程中出错:', error);
  }
}
