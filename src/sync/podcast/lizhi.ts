import type { SyncData, PodcastData } from '~sync/common';

export async function PodcastLiZhi(data: SyncData) {
  const { title, description, audio } = data.data as PodcastData;

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

  async function uploadAudioFile() {
    try {
      // 等待文件输入框出现
      await waitForElement('input[type="file"]');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      console.debug('try upload file', audio);
      console.debug('fileInput', fileInput);

      // 获取文件数据
      const response = await fetch(audio.url);
      const arrayBuffer = await response.arrayBuffer();
      const extension = audio.name.split('.').pop();
      const fileName = `${title.replaceAll('.', '_')}.${extension}`;
      const file = new File([arrayBuffer], fileName, { type: audio.type });

      console.debug('uploadFile', file);

      // 创建 DataTransfer 对象并添加文件
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // 触发必要的事件
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));

      console.debug('文件上传操作完成');

      // 等待上传完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 查找并点击"其他设置"按钮
      const spans = document.querySelectorAll('span');
      const otherSettingSpan = Array.from(spans).find((span) => span.textContent === '其他设置');

      console.debug('otherSettingSpan', otherSettingSpan);
      if (!otherSettingSpan) {
        console.debug('未找到其他设置元素');
        return;
      }

      otherSettingSpan.click();
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await waitForElement('input#name');

      // 填写标题
      const titleInput = document.querySelector('input#name') as HTMLInputElement;
      console.debug('titleInput', titleInput);

      // 填写描述
      const qlEditor = document.querySelector('div[contenteditable="true"]') as HTMLDivElement;
      console.debug('qlEditor', qlEditor);

      if (!qlEditor) {
        console.debug('未找到编辑器元素');
        return;
      }

      qlEditor.innerHTML = description || '';
      qlEditor.dispatchEvent(new Event('input', { bubbles: true }));
      qlEditor.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
      console.error('上传音频文件时出错:', error);
      throw error;
    }
  }

  try {
    await uploadAudioFile();
    console.debug('荔枝播客内容上传完成');
  } catch (error) {
    console.error('荔枝播客上传失败:', error);
    throw error;
  }
}
