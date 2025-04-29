import type { DynamicData, SyncData } from '../common';

export async function DynamicX(data: SyncData) {
  const { title, content, images, videos } = data.data as DynamicData;
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

  try {
    // 等待编辑器元素出现
    await waitForElement('div[data-contents="true"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 获取编辑器元素
    const editor = document.querySelector('div[data-contents="true"]');
    if (!editor) {
      console.debug('未找到编辑器元素');
      return;
    }

    // 聚焦编辑器
    (editor as HTMLElement).focus();

    // 使用 ClipboardEvent 粘贴文本
    const combinedText = title ? `${title}\n${content || ''}` : content || '';
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData!.setData('text/plain', combinedText);
    editor.dispatchEvent(pasteEvent);

    // 处理媒体上传（图片和视频）
    const mediaFiles = [...(images || []), ...(videos || [])];
    if (mediaFiles.length > 0) {
      // 查找文件输入元素
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (!fileInput) {
        console.debug('未找到文件输入元素');
        return;
      }

      // 创建数据传输对象
      const dataTransfer = new DataTransfer();

      // 上传文件（最多4个）
      for (let i = 0; i < mediaFiles.length; i++) {
        if (i >= 4) {
          console.debug('X 最多支持 4 张 ，跳过');
          break;
        }

        const fileInfo = mediaFiles[i];
        console.debug('try upload file', fileInfo);

        // 获取文件内容
        const response = await fetch(fileInfo.url);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], fileInfo.name, { type: fileInfo.type });
        console.log('file', file);
        dataTransfer.items.add(file);
      }

      // 设置文件并触发事件
      fileInput.files = dataTransfer.files;

      // 触发change事件
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      // 触发input事件
      const inputEvent = new Event('input', { bubbles: true });
      fileInput.dispatchEvent(inputEvent);

      console.debug('文件上传操作完成');
    }

    // 判断是否自动发布
    if (!data.isAutoPublish) return;

    // 等待一段时间确保文件上传完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 查找发布按钮
    const allButtons = document.querySelectorAll('button');
    const publishButton = Array.from(allButtons).find(
      (button) =>
        button.textContent?.includes('发帖') ||
        button.textContent?.includes('Post') ||
        button.textContent?.includes('發佈'),
    );

    console.debug('sendButton', publishButton);

    if (publishButton) {
      // 如果找到发布按钮，检查是否可点击
      let attempts = 0;
      while (publishButton.disabled && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
        console.debug(`Waiting for send button to be enabled. Attempt ${attempts}/10`);
      }

      if (publishButton.disabled) {
        console.debug('Send button is still disabled after 10 attempts');
        return;
      }

      console.debug('sendButton clicked');
      // 点击发布按钮
      const clickEvent = new Event('click', { bubbles: true });
      publishButton.dispatchEvent(clickEvent);
    } else {
      // 如果没找到发布按钮，尝试使用快捷键发布
      console.debug("未找到'发送'按钮");
      const keyEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        metaKey: true,
        composed: true,
      });

      // 再次聚焦编辑器并发送快捷键
      (editor as HTMLElement).focus();
      editor.dispatchEvent(keyEvent);
      console.debug('CMD+Enter 事件触发完成');
    }
  } catch (error) {
    console.error('X 发布过程中出错:', error);
  }
}
