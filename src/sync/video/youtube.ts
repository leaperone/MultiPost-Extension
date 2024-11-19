import type { SyncData, VideoData } from '../common';

export async function VideoYoutube(data: SyncData) {
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
    const { content, video, title } = data.data as VideoData;

    // 等待上传按钮出现并点击
    const uploadIcon = await waitForElement("ytcp-icon-button#upload-icon");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!uploadIcon) {
      console.error("未找到上传按钮");
      return;
    }
    (uploadIcon as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 处理视频上传
    if (video) {
      const fileInput = await waitForElement('input[type="file"]') as HTMLInputElement;
      if (!fileInput) {
        console.error("未找到文件输入框");
        return;
      }

      const response = await fetch(video.url);
      const arrayBuffer = await response.arrayBuffer();
      const videoFile = new File([arrayBuffer], video.name, { type: video.type });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(videoFile);
      fileInput.files = dataTransfer.files;

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('文件上传操作完成');
    } else {
      console.error('没有视频文件');
      return;
    }

    // 等待标题输入框出现
    await waitForElement("#title-textarea");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理标题输入
    const titleArea = document.querySelector("#title-textarea");
    if (!titleArea) {
      console.error("未找到标题输入区域");
      return;
    }
    const titleInput = titleArea.querySelector("#textbox") as HTMLElement;
    if (!titleInput) {
      console.error("未找到标题输入框");
      return;
    }
    titleInput.innerHTML = title || content.slice(0, 20);

    // 处理描述输入
    const descriptionArea = document.querySelector("#description-textarea");
    if (descriptionArea) {
      const descriptionInput = descriptionArea.querySelector("#textbox") as HTMLElement;
      if (descriptionInput) {
        descriptionInput.innerHTML = content || "";
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 自动发布逻辑
    // if (data.autoPublish) {
    //   const buttons = document.querySelectorAll("button");
    //   const publishButton = Array.from(buttons).find(
    //     (button) => button.textContent === "发布"
    //   );
    //   if (publishButton) {
    //     console.log("发布按钮被点击");
    //     (publishButton as HTMLElement).click();
    //   } else {
    //     console.log("未找到'发布'按钮");
    //   }
    // }
  } catch (error) {
    console.error('YoutubeVideo 发布过程中出错:', error);
  }
}
