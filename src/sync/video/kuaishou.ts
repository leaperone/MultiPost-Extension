import type { SyncData, VideoData } from '../common';

export async function VideoKuaishou(data: SyncData) {
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

  // 辅助函数：上传视频
  async function uploadVideo() {
    const fileInput = (await waitForElement('input[type=file][accept="video/*,.mp4,.mov,.flv,.f4v,.webm,.mkv,.rm,.rmvb,.m4v,.3gp,.3g2,.wmv,.avi,.asf,.mpg,.mpeg,.ts"]')) as HTMLInputElement;
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
  await waitForElement('div#rc-tabs-0-tab-2');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 上传视频
  await uploadVideo();

  // 填写内容
  const contentEditor = (await waitForElement('div#work-description-edit[contenteditable="true"]')) as HTMLDivElement;
  if (contentEditor) {
    contentEditor.innerText = `${title || ''}\n\n${content}`;
    contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 等待内容更新
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 自动选择前三个标签
  const recommendationTitle = await waitForElement('div._recommend-title_oei9t_269'); // 等待"话题推荐"标题出现
  const tagsContainer = recommendationTitle.nextElementSibling; // 获取下一个兄弟元素作为标签容器
  if (tagsContainer) {
    const tags = Array.from(tagsContainer.querySelectorAll('span._tag_oei9t_283')).filter((tag) => tag.textContent); // 获取所有标签
    if (tags.length > 0) {
      for (let i = 0; i < Math.min(3, tags.length); i++) {
        const tag = tags[i] as HTMLElement; // 类型断言为 HTMLElement
        tag.click(); // 点击选择标签
      }
    }
  }

  // 发布按钮逻辑
  if (data.auto_publish) {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const publishButton = (await waitForElement('div[contains(., "发布")]', 5000)) as HTMLElement;
        publishButton.click();
        console.log('发布按钮已点击');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.href = 'https://cp.kuaishou.com/article/manage/video';
        break; // 成功点击后退出循环
      } catch (error) {
        console.warn(`第 ${attempt + 1} 次尝试查找发布按钮失败:`, error);
        if (attempt === maxAttempts - 1) {
          console.error('达到最大尝试次数，无法找到发布按钮');
        }
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒后重试
      }
    }
  }
}
