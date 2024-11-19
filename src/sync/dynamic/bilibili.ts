import { type DynamicData, type SyncData } from '../common';

export async function DynamicBilibili(data: SyncData) {
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

  // 新增函数：检查图片上传是否完成
  async function checkImageUploadCompletion(
    expectedNewCount: number,
    initialCount: number,
    maxAttempts = 30,
    interval = 1000,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const currentSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;
      const newlyUploadedCount = currentSuccessCount - initialCount;

      if (newlyUploadedCount === expectedNewCount) {
        console.log(`所有 ${expectedNewCount} 张新图片已成功上传`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    const finalSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;
    const actualNewlyUploadedCount = finalSuccessCount - initialCount;
    console.warn(`图片上传检查超时：预期新增 ${expectedNewCount} 张，实际新增 ${actualNewlyUploadedCount} 张`);
  }

  async function cleanUploadedImages(): Promise<void> {
    console.log('开始清理已上传的图片');

    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const removeButton = document.querySelector('div.bili-pics-uploader__item__remove') as HTMLElement;

      if (!removeButton) {
        console.log(`没有找到更多图片，已清理 ${i} 张图片`);
        break;
      }

      removeButton.click();
      console.log(`已清理第 ${i + 1} 张图片`);
    }

    console.log('图片清理完成');
  }

  try {
    const { content, images, title } = data.data as DynamicData;

    // 等待编辑器出现
    const editor = (await waitForElement(
      'div[placeholder="有什么想和大家分享的？"][contenteditable="true"]',
    )) as HTMLDivElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 聚焦编辑器
    editor.focus();

    // 清空编辑器内容
    editor.textContent = '';

    // 插入新内容
    editor.textContent = content || '';

    // 触发 input 事件
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: content || '',
    });
    editor.dispatchEvent(inputEvent);

    console.log('编辑器内容已更新');

    // 处理标题输入
    if (title) {
      const titleInput = (await waitForElement('input.bili-dyn-publishing__title__input')) as HTMLInputElement;
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('标题已输入:', title);
    }

    // 处理图片上传
    const uploadModule = document.querySelector('div.bili-dyn-publishing__image-upload') as HTMLDivElement;
    if (uploadModule) {
      uploadModule.style.display = 'block';
    }

    // 在上传新图片之前清理已有图片
    await cleanUploadedImages();

    if (images.length > 0) {
      const imageData = [];
      for (const file of images) {
        const response = await fetch(file.url);
        const blob = await response.blob();
        const imageFile = new File([blob], file.name, { type: file.type });
        console.log(`文件: ${imageFile.name} ${imageFile.type} ${imageFile.size}`);
        imageData.push(imageFile);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 获取上传前的成功图片数量
      const initialSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;

      window.postMessage({ type: 'BILIBILI_DYNAMIC_UPLOAD_IMAGES', files: imageData }, '*');

      // 添加图片上传完成检查
      await checkImageUploadCompletion(images.length, initialSuccessCount);
    }

    // 发布动态
    // const publishResult = await publishDynamic(content, imageData);
    // if (publishResult) {
    //     console.log('动态发布成功');
    // } else {
    //     console.log('动态发布失败');
    // }
    if (data.auto_publish) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const publishButton = document.querySelector('div.bili-dyn-publishing__action.launcher') as HTMLDivElement;
        if (publishButton) {
          publishButton.click();
          console.log('已点击发布按钮');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      const publishButton = (await waitForElement('div.bili-dyn-publishing__action.launcher')) as HTMLDivElement;

      if (publishButton) {
        // 添加点击事件监听器
        publishButton.addEventListener('click', async () => {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
        });
        console.log('已为发布按钮添加点击事件监听器');
      } else {
        console.log('未找到发布按钮');
      }
    }
  } catch (error) {
    console.error('biliDynamic 发布过程中出错:', error);
  }
}
