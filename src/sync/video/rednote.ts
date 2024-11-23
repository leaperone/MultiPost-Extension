import type { SyncData, VideoData } from '../common';

export async function VideoRednote(data: SyncData) {
  const { content, video, title } = data.data as VideoData;
  // 辅助函数：等待元素出现
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

  // 辅助函数：上传文件
  async function uploadVideo() {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();

    if (video) {
      try {
        const response = await fetch(video.url);
        if (!response.ok) {
          throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }
        const blob = await response.blob();
        const file = new File([blob], video.name, { type: video.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`上传视频 ${video.url} 失败:`, error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待文件处理
      console.log('文件上传操作完成');
    } else {
      console.error('没有成功添加任何文件');
    }
  }

  // 等待页面加载
  await waitForElement('span[class="title"]');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 上传视频
  await uploadVideo();

  // 填写标题
  const titleInput = (await waitForElement('input[class="el-input__inner"]')) as HTMLInputElement;
  if (titleInput) {
    titleInput.value = title || content.slice(0, 20);
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 填写内容
  const contentEditor = (await waitForElement('p.post-content')) as HTMLParagraphElement;
  if (contentEditor) {
    contentEditor.innerText = content;
    contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 等待内容更新
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 发布按钮
  // if (data.auto_publish) {
  //   const maxAttempts = 3;
  //   for (let attempt = 0; attempt < maxAttempts; attempt++) {
  //     try {
  //       const publishButton = (await waitForElement('button[class="el-button publishBtn"]', 5000)) as HTMLButtonElement;
  //       publishButton.click();
  //       console.log('发布按钮已点击');
  //       await new Promise((resolve) => setTimeout(resolve, 3000));
  //       window.location.href = 'https://creator.xiaohongshu.com/new/note-manager';
  //       break; // 成功点击后退出循环
  //     } catch (error) {
  //       console.warn(`第 ${attempt + 1} 次尝试查找发布按钮失败:`, error);
  //       if (attempt === maxAttempts - 1) {
  //         console.error('达到最大尝试次数，无法找到发布按钮');
  //       }
  //       await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒后重试
  //     }
  //   }
  // }
}
