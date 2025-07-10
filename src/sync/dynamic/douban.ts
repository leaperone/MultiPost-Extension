import type { DynamicData, SyncData } from '../common';

// 优先发布图文
export async function DynamicDouban(data: SyncData) {
  const dynamicData = data.data as DynamicData;
  console.debug('DynamicDouban', data);

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

  // 激活全屏模式
  async function activateFullscreen() {
    try {
      await waitForElement('i.DRE-lite-editor-fullscreen');
      const fullscreenButton = document.querySelector('i.DRE-lite-editor-fullscreen') as HTMLElement;
      console.debug('fullscreenButton', fullscreenButton);
      
      if (fullscreenButton) {
        fullscreenButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (e) {
      console.debug('error', e);
      console.debug('全屏按钮未找到，继续执行');
    }
  }

  // 填写标题
  async function fillTitle() {
    if (!dynamicData.title) return;
    
    const titleTextarea = document.querySelector('textarea[placeholder="请输入标题"]') as HTMLTextAreaElement;
    console.debug('titleTextarea', titleTextarea);
    
    if (titleTextarea) {
      titleTextarea.value = dynamicData.title;
      titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // 填写内容
  async function fillContent() {
    // 查找内容编辑器
    const titleTextarea = document.querySelector('textarea[placeholder="请输入标题"]');
    let contentEditor = titleTextarea?.parentElement?.parentElement?.parentElement?.querySelector(
      'div[aria-placeholder="此刻你想要分享..."]'
    ) as HTMLElement;
    
    if (!contentEditor) {
      contentEditor = document.querySelector('div[aria-placeholder="此刻你想要分享..."]') as HTMLElement;
    }
    
    console.debug('contentEditor', contentEditor);
    
    if (contentEditor) {
      const content = dynamicData.content || '';
      
      // 使用粘贴事件填写内容
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      
      pasteEvent.clipboardData!.setData('text/html', content);
      contentEditor.dispatchEvent(pasteEvent);
      contentEditor.dispatchEvent(new Event('click', { bubbles: true }));
      contentEditor.dispatchEvent(new Event('change', { bubbles: true }));
      
      // 等待内容更新
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      console.debug('内容填写完成');
    } else {
      console.error('未找到内容编辑器');
    }
  }

  // 上传图片
  async function uploadFiles() {
    if (!dynamicData.images?.length) return;

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    console.debug('fileInput', fileInput);
    
    if (!fileInput) {
      console.debug('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    
    for (let i = 0; i < dynamicData.images.length; i++) {
      if (i >= 18) {
        console.debug('最多上传18张图片');
        break;
      }

      const fileInfo = dynamicData.images[i];
      if (!fileInfo.type.startsWith('image/')) {
        console.debug('skip non-image file', fileInfo);
        continue;
      }

      try {
        console.debug('try upload file', fileInfo);
        const response = await fetch(fileInfo.url);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], fileInfo.name, { type: fileInfo.type });
        dataTransfer.items.add(file);
      } catch (error) {
        console.error('上传文件失败:', error);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.debug('文件上传操作完成');
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 查找确认上传按钮
      const buttons = document.querySelectorAll('button[type="button"]');
      console.debug('buttons', buttons);
      
      const confirmButton = Array.from(buttons).find(
        (btn) => btn.textContent?.trim() === '确定上传'
      ) as HTMLButtonElement;
      
      console.debug('confirmButton', confirmButton);
      
      if (confirmButton) {
        confirmButton.click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        // 等待上传完成
        let attempts = 0;
        while (attempts <= 60) {
          attempts++;
          const uploadingElement = document.querySelector('.DRE-upload-status-text.uploading');
          console.debug('uploading', uploadingElement);
          
          if (uploadingElement) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            break;
          }
        }
      }
    }
  }

  // 发布动态
  async function publishDynamic() {
    if (!data.isAutoPublish) return;

    const buttons = document.querySelectorAll('button[type="button"]');
    console.debug('buttons', buttons);
    
    const sendButton = Array.from(buttons).find(
      (btn) => btn.textContent?.includes('发布')
    ) as HTMLButtonElement;
    
    console.debug('sendButton', sendButton);
    
    if (sendButton) {
      console.debug('sendButton clicked');
      sendButton.click();
    } else {
      console.debug('未找到"发布"按钮');
    }
  }

  // 主流程
  try {
    await activateFullscreen();
    await fillTitle();
    await fillContent();
    await uploadFiles();
    await publishDynamic();
  } catch (error) {
    console.error('发布动态失败:', error);
  }
}