import type { SyncData, DynamicData } from "../common";

export async function DynamicInstagramImage(data: SyncData) {
  console.log('InstagramImage 函数被调用');

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
    const { title, content, images } = data.data as DynamicData;

    // 等待页面加载完成
    await waitForElement("body");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找并点击"新帖子"按钮
    const createPostButton = document.querySelector('svg[aria-label="新帖子"]') ||
                             document.querySelector('svg[aria-label="New post"]') ||
                             document.querySelector('svg[aria-label="新貼文"]');
    if (!createPostButton) {
      console.debug("未找到创建帖子按钮");
      return;
    }
    createPostButton.dispatchEvent(new Event("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 上传图片
    if (images && images.length > 0) {
      const fileInput = await waitForElement('input[type="file"]') as HTMLInputElement;
      if (!fileInput) {
        console.debug("未找到文件输入元素");
        return;
      }

      const dataTransfer = new DataTransfer();
      for (const image of images) {
        console.debug("尝试上传文件", image);
        try {
          const response = await fetch(image.url);
          const blob = await response.blob();
          const file = new File([blob], image.name, { type: image.type });
          dataTransfer.items.add(file);
        } catch (error) {
          console.error("获取文件失败:", error);
        }
      }

      fileInput.files = dataTransfer.files;

      // 触发文件选择事件
      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      console.debug("文件上传操作完成");

      // 等待文件上传完成
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // 点击"继续"或"下一步"按钮
    await new Promise((resolve) => setTimeout(resolve, 3000));
    let continueButton = Array.from(document.querySelectorAll('div[role="button"][tabindex="0"]'))
      .find(el => el.textContent?.includes("继续") || el.textContent?.includes("下一步") || el.textContent?.includes("Next")) as HTMLElement;
    
    if (!continueButton) {
      console.debug("未找到继续按钮");
      return;
    }
    continueButton.click()

    // 点击"继续"或"下一步"按钮
    await new Promise((resolve) => setTimeout(resolve, 3000));
    continueButton = Array.from(document.querySelectorAll('div[role="button"][tabindex="0"]'))
      .find(el => el.textContent?.includes("继续") || el.textContent?.includes("下一步") || el.textContent?.includes("Next")) as HTMLElement;
    
    if (!continueButton) {
      console.debug("未找到继续按钮");
      return;
    }
    continueButton.click()

    // 输入帖子内容
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const captionEditor = Array.from(document.querySelectorAll('div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]'))
      .find(el => {
        const placeholder = el.getAttribute("aria-placeholder");
        return placeholder?.includes("输入说明文字") || placeholder?.includes("撰寫說明文字") || placeholder?.includes("Write a caption");
      }) as HTMLElement;

    if (!captionEditor) {
      console.debug("未找到编辑器元素");
      return;
    }

    captionEditor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });
    pasteEvent.clipboardData.setData("text/plain", `${title}\n${content}` || "");
    captionEditor.dispatchEvent(pasteEvent);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    captionEditor.blur();

    // 查找并点击"分享"按钮
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const createPostDialog = document.querySelector('div[aria-label="创建新帖子"][role="dialog"]') ||
                             document.querySelector('div[aria-label="建立新貼文"][role="dialog"]') ||
                             document.querySelector('div[aria-label="Create new post"][role="dialog"]');

    if (!createPostDialog) {
      console.debug("未找到创建新帖子对话框");
      return;
    }

    const shareButton = Array.from(createPostDialog.querySelectorAll('div[role="button"][tabindex="0"]'))
      .find(el => el.textContent?.includes("分享") || el.textContent?.includes("Share"));

    if (!shareButton) {
      console.debug("未找到分享按钮");
      return;
    }

    console.log(shareButton);

    // 如果需要自动发布，取消下面的注释
    // shareButton.click();
    console.debug("帖子准备就绪，等待手动发布");

  } catch (error) {
    console.error('InstagramDynamic 发布过程中出错:', error);
  }
}
