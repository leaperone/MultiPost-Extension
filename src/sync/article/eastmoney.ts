/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleData, FileData, SyncData } from '~sync/common';

export async function ArticleEastmoney(data: SyncData) {
  // 获取 cookie 的辅助函数
  const getCookie = (name: string) => {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    return cookie?.split('=')[1];
  };

  // 上传单个图片
  async function uploadImage(fileInfo: FileData): Promise<string | null> {
    try {
      console.debug('uploadImage -->', fileInfo);

      // 构建上传 URL
      const url = new URL('https://gbapi.eastmoney.com/iimage/image');
      url.searchParams.set('platform', '');
      const uploadUrl = url.toString();

      // 获取图片 blob 并创建 File 对象
      const blob = await (await fetch(fileInfo.url)).blob();
      const file = new File([blob], fileInfo.name, { type: fileInfo.type });

      // 创建表单数据
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ctoken', getCookie('ct'));
      formData.append('utoken', getCookie('ut'));

      // 发送上传请求
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.debug('Image upload result:', result);

      if (result && result?.data?.url) {
        return result.data.url;
      }
      return null;
    } catch (error) {
      console.debug('Error uploading image:', error);
      return null;
    }
  }

  // 处理文章内容中的图片
  async function processContent(htmlContent: string, imageFiles: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images = doc.getElementsByTagName('img');

    for (const img of images) {
      img.remove();
    }
    return doc.body.innerHTML;

    console.debug('images -->', images);

    for (let i = 0; i < images.length; i++) {
      updateTip(`正在上传第 ${i + 1}/${images.length} 张图片`);

      const img = images[i];
      const src = img.getAttribute('src');

      if (src) {
        console.debug('try replace ', src);
        const fileInfo = imageFiles.find((f) => f.url === src);

        if (fileInfo) {
          const newUrl = await uploadImage(fileInfo);
          if (newUrl) {
            img.remove();
          }
        }
      }
    }

    return doc.body.innerHTML;
  }

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

  // 发布文章
  async function publishArticle(syncData: SyncData, updateTipFn: (message: string) => void): Promise<void> {
    const articleData = syncData.data as ArticleData;
    articleData.htmlContent = await processContent(articleData.htmlContent, articleData.images || []);

    // 等待标题输入框加载
    await waitForElement('input[placeholder="标题(1-64字)"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 填写标题
    const titleInput = document.querySelector('input[placeholder="标题(1-64字)"]') as HTMLInputElement;
    if (titleInput) {
      titleInput.value = articleData.title?.slice(0, 64);
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    console.debug('titleTextarea', titleInput, titleInput?.value, articleData.title?.slice(0, 100));

    // 获取编辑器元素
    const editor = document.querySelector('div.ProseMirror[contenteditable="true"]') as HTMLElement;
    console.debug('qlEditor', editor);

    if (!editor) {
      console.debug('未找到编辑器元素');
      return;
    }

    // 点击编辑器并粘贴内容
    editor.click();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/html', articleData.htmlContent || '');
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    // 等待内容加载
    await new Promise((resolve) => setTimeout(resolve, 5000));
    updateTipFn('准备上传封面...');

    // 处理封面图片上传
    const selectCoverImg = document.querySelector('div.select-cover-img') as HTMLElement;
    console.debug('selectCoverImg', selectCoverImg);

    if (selectCoverImg) {
      selectCoverImg.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 切换到上传标签
      const tabUpload = document.querySelector('div#tab-upload[aria-controls="pane-upload"]') as HTMLElement;
      console.debug('tabUpload', tabUpload);

      if (tabUpload) {
        tabUpload.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 获取文件上传输入框
        const fileInputs = document.querySelectorAll('input#upload_input');
        console.debug('fileInputs', fileInputs);

        const fileInput = fileInputs[fileInputs.length - 1] as HTMLInputElement;
        console.debug('fileInput', fileInput);

        // 上传封面图片
        const dataTransfer = new DataTransfer();
        const coverFile = articleData.cover;
        console.debug('try upload file', coverFile);

        const response = await fetch(coverFile.url);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], coverFile.name, { type: coverFile.type });

        dataTransfer.items.add(file);
        console.debug('uploaded');

        if (dataTransfer.files.length > 0) {
          fileInput.files = dataTransfer.files;

          const changeEvent = new Event('change', { bubbles: true });
          fileInput.dispatchEvent(changeEvent);

          const inputEvent = new Event('input', { bubbles: true });
          fileInput.dispatchEvent(inputEvent);

          console.debug('文件上传操作完成');
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    // 勾选阅读协议
    const checkIcon = document.querySelector('footer.read_item > i.check-icon') as HTMLElement;
    console.debug('checkIcon', checkIcon);
    if (checkIcon) {
      checkIcon.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 发布按钮
    const sendButton = document.querySelector('div.button_publish.item.editor-btn.editor-main-btn') as HTMLElement;
    console.debug('sendButton', sendButton);

    if (sendButton) {
      if (syncData?.isAutoPublish) {
        console.debug('sendButton clicked');
        const clickEvent = new Event('click', { bubbles: true });
        sendButton.dispatchEvent(clickEvent);
      }
    } else {
      console.debug("未找到'发送'按钮");
    }
  }

  // 更新提示
  function updateTip(message: string) {
    const tipElement = tip.querySelector('.float-tip') as HTMLDivElement;
    if (tipElement) {
      tipElement.textContent = message;
    }
  }

  // 主流程
  const host = document.createElement('div') as HTMLDivElement;
  const tip = document.createElement('div') as HTMLDivElement;

  try {
    // 添加漂浮提示
    host.style.position = 'fixed';
    host.style.bottom = '20px';
    host.style.right = '20px';
    host.style.zIndex = '9999';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    tip.innerHTML = `
      <style>
        .float-tip {
          background: #1e293b;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      </style>
      <div class="float-tip">
        正在同步文章到东方财富...
      </div>
    `;
    shadow.appendChild(tip);

    // 发布文章
    await publishArticle(data, updateTip);

    // 延迟移除提示
    setTimeout(() => {
      if (document.body.contains(host)) {
        document.body.removeChild(host);
      }
    }, 3000);
  } catch (error) {
    if (document.body.contains(host)) {
      const floatTip = tip.querySelector('.float-tip') as HTMLDivElement;
      floatTip.textContent = '同步失败，请重试';
      floatTip.style.backgroundColor = '#dc2626';

      setTimeout(() => {
        document.body.removeChild(host);
      }, 3000);
    }

    console.error('发布文章失败:', error);
    throw error;
  }
}
