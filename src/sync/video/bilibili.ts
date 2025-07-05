import { type FileData, type SyncData, type VideoData } from '../common';

export async function VideoBilibili(data: SyncData) {
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

  async function uploadCover(cover: FileData): Promise<void> {
    console.log('开始上传封面', cover);
    await waitForElement('div.cover-main-img > div.img');
    const coverUploadButton = document.querySelector('div.cover-main-img > div.img') as HTMLElement;
    if (!coverUploadButton) {
      console.log('未找到封面上传按钮');
      return;
    }

    coverUploadButton.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const tabContainer = document.querySelector('div.cover-select-header-tab');
    if (!tabContainer) {
      console.log('未找到封面选择的tab容器');
      return;
    }

    const uploadTab = tabContainer.firstChild?.nextSibling as HTMLElement;
    if (!uploadTab) {
      console.log('未找到上传封面tab');
      return;
    }
    uploadTab.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const fileInput = document.querySelector(
      "div.bcc-upload-wrapper > input[type='file'][accept='image/png, image/jpeg']",
    ) as HTMLInputElement;

    if (!fileInput) {
      console.log('未找到封面上传的文件输入框');
      return;
    }

    const dataTransfer = new DataTransfer();
    if (!cover.type.includes('image/')) {
      console.log('封面文件类型不正确');
      return;
    }

    const response = await fetch(cover.url);
    const blob = await response.blob();
    const coverFile = new File([blob], cover.name, { type: cover.type });
    dataTransfer.items.add(coverFile);

    if (dataTransfer.files.length === 0) {
      return;
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('封面文件上传操作已触发');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const doneButtons = document.querySelectorAll('div.cover-select-footer-pick button');
    const doneButton = Array.from(doneButtons).find((btn) => btn.textContent === ' 完成 ');

    if (doneButton) {
      (doneButton as HTMLElement).click();
      console.log('封面上传完成');
    } else {
      console.log('未找到"完成"按钮');
    }
  }

  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;

    // 创建一个新的 File 对象，因为某些浏览器可能不允许直接设置 fileInput.files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    console.log('视频上传事件已触发');
  }

  async function waitForUploadCompletion(timeout = 600000): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const spans = document.querySelectorAll('span');
        const uploadCompleteElement = Array.from(spans).find(
          (span) => span.textContent && span.textContent.includes('上传完成'),
        );
        if (uploadCompleteElement) {
          clearInterval(checkInterval);
          console.log('视频上传完成');
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('视频上传超时'));
      }, timeout);
    });
  }

  try {
    const { content, video, title, tags, cover } = data.data as VideoData;

    // 处理视频上传
    if (video) {
      await waitForElement('input[type="file"]');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await fetch(video.url);
      const blob = await response.arrayBuffer();
      const extension = video.name.split('.').pop() || 'mp4';
      const videoFilename = `${title}.${extension}`;
      const videoFile = new File([blob], videoFilename, { type: video.type });

      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log('视频上传已初始化');

      try {
        await waitForUploadCompletion();
        console.log('视频上传已完成，继续后续操作');
      } catch (error) {
        console.error('等待视频上传完成时出错:', error);
        return;
      }
    } else {
      console.error('没有视频文件');
      return;
    }

    // 处理标题输入
    const titleInput = (await waitForElement('input.input-val[type="text"][maxlength="80"]')) as HTMLInputElement;
    if (title) {
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('标题已输入:', title);
    }

    // 等待简介编辑器出现并输入内容
    const editor = (await waitForElement('div.ql-editor[contenteditable="true"]')) as HTMLDivElement;
    if (editor) {
      editor.innerHTML = content || '';
      console.log('简介已输入:', content);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 处理标签
    // 清除已有标签
    const existingTags = document.querySelectorAll('div.tag-pre-wrp > div.label-item-v2-container');
    console.log(`发现 ${existingTags.length} 个已有标签，准备清除...`);
    for (let i = 0; i < existingTags.length; i++) {
      const tag = existingTags[i] as HTMLElement;
      const closeButton = tag.querySelector('.label-item-v2-close');
      if (closeButton) {
        (closeButton as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    if (!tags || tags.length === 0) {
      // 如果没有指定标签，选择热门标签
      console.log('未指定标签，选择热门标签...');
      const hotTags = document.querySelectorAll('.hot-tag-item');
      if (hotTags.length > 0) {
        for (let i = 0; i < 3 && i < hotTags.length; i++) {
          const tag = hotTags[i] as HTMLElement;
          tag.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } else {
      // 添加指定的标签
      console.log('添加指定标签...');
      const tagInput = document.querySelector('input[placeholder="按回车键Enter创建标签"]') as HTMLInputElement;
      if (tagInput) {
        for (const tag of tags.slice(0, 10)) {
          tagInput.value = tag;
          const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
          });
          tagInput.dispatchEvent(enterEvent);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // 上传封面
    if (cover) {
      await uploadCover(cover);
    }

    // 等待标签和封面处理完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 如果需要自动发布
    if (data.isAutoPublish) {
      const submitButton = document.querySelector('span.submit-add') as HTMLElement;
      if (submitButton) {
        console.log('点击发布按钮');
        submitButton.click();
      } else {
        console.log('未找到"发送"按钮');
      }
    }
  } catch (error) {
    console.error('BilibiliVideo 发布过程中出错:', error);
  }
}
