import type { SyncData, PodcastData } from '~sync/common';


export async function PodcastQQMusic(data: SyncData) {
  const { title, audio } = data.data as PodcastData;

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

  // 辅助函数：上传音频文件
  async function uploadAudioFile() {
    try {
      // 等待文件输入框出现
      const fileInput = (await waitForElement('input[type="file"][accept=".mp3,.wav,.m4a,.aac"]')) as HTMLInputElement;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.debug('try upload file', audio);
      console.debug('fileInput -->', fileInput);

      // 获取文件数据
      const response = await fetch(audio.url);
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], audio.name, { type: audio.type });

      // 创建 DataTransfer 对象并添加文件
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // 触发必要的事件
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));

      console.debug('文件上传操作完成');

      // 等待上传完成
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 填写标题
      const titleInput = document.querySelector(
        'input[type="text"][autocomplete="off"][placeholder="请输入作品名称"]',
      ) as HTMLInputElement;

      console.debug('titleInput', titleInput);

      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      console.error('上传音频文件时出错:', error);
      throw error;
    }
  }

  try {
    await uploadAudioFile();
    console.debug('QQ音乐播客内容上传完成');
  } catch (error) {
    console.error('QQ音乐播客上传失败:', error);
    throw error;
  }
}
