import type { DynamicData, SyncData } from "../common";

export async function DynamicInstagram(data: SyncData) {
  console.log("Instagram 函数被调用");

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
    const { title, content, images, videos } = data.data as DynamicData;

    // 等待页面加载完成
    await waitForElement("body");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找并点击"新帖子"按钮
    const createPostButton =
      document.querySelector('svg[aria-label="新帖子"]') ||
      document.querySelector('svg[aria-label="New post"]') ||
      document.querySelector('svg[aria-label="新貼文"]');
    if (!createPostButton) {
      console.debug("未找到创建帖子按钮");
      return;
    }
    console.debug("createPostButton", createPostButton);
    createPostButton.dispatchEvent(new Event("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找并点击"帖子"按钮（选择帖子类型）
    const postTypeButton =
      document.querySelector('svg[aria-label="帖子"]') ||
      document.querySelector('svg[aria-label="Post"]') ||
      document.querySelector('svg[aria-label="貼文"]');
    if (postTypeButton) {
      console.debug("postTypeButton", postTypeButton);
      postTypeButton.dispatchEvent(new Event("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 上传媒体文件（图片和视频）
    const mediaFiles = [...(images || []), ...(videos || [])];
    if (mediaFiles.length > 0) {
      const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
      if (!fileInput) {
        console.debug("未找到文件输入元素");
        return;
      }
      console.debug("fileInput", fileInput);

      const dataTransfer = new DataTransfer();
      for (const media of mediaFiles) {
        console.debug("尝试上传文件", media);
        try {
          const response = await fetch(media.url);
          const arrayBuffer = await response.arrayBuffer();
          const file = new File([arrayBuffer], media.name, { type: media.type });
          dataTransfer.items.add(file);
        } catch (error) {
          console.error("获取文件失败:", error);
        }
      }

      fileInput.files = dataTransfer.files;

      // 触发文件选择事件
      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
      const inputEvent = new Event("input", { bubbles: true });
      fileInput.dispatchEvent(inputEvent);

      console.debug("媒体文件上传操作完成");

      // 等待文件上传完成，视频可能需要更长时间
      const waitTime = videos?.length ? 10000 : 5000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // 点击"继续"或"下一步"按钮（第一次）
    await new Promise((resolve) => setTimeout(resolve, 3000));
    let buttons = document.querySelectorAll('div[role="button"][tabindex="0"]');
    let continueButton = Array.from(buttons).find(
      (el) =>
        el.textContent?.includes("继续") || el.textContent?.includes("下一步") || el.textContent?.includes("Next"),
    ) as HTMLElement;

    console.debug("continueButton", continueButton);
    if (!continueButton) {
      console.debug("未找到继续按钮");
      return;
    }
    continueButton.click();

    // 点击"继续"或"下一步"按钮（第二次）
    await new Promise((resolve) => setTimeout(resolve, 3000));
    buttons = document.querySelectorAll('div[role="button"][tabindex="0"]');
    continueButton = Array.from(buttons).find(
      (el) =>
        el.textContent?.includes("继续") || el.textContent?.includes("下一步") || el.textContent?.includes("Next"),
    ) as HTMLElement;

    console.debug("continueButton2", continueButton);
    if (!continueButton) {
      console.debug("未找到继续按钮");
      return;
    }
    continueButton.click();

    // 输入帖子内容
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const captionEditors = document.querySelectorAll(
      'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]',
    );
    const captionEditor = Array.from(captionEditors).find((el) => {
      const placeholder = el.getAttribute("aria-placeholder");
      console.debug("ariaPlaceholder", placeholder);
      return (
        placeholder?.includes("输入说明文字") ||
        placeholder?.includes("撰寫說明文字") ||
        placeholder?.includes("Write a caption")
      );
    }) as HTMLElement;

    console.debug("captionEditor", captionEditor);
    if (!captionEditor) {
      console.debug("未找到编辑器元素");
      return;
    }

    captionEditor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    const captionContent = title ? `${title}\n${content}` : content || "";
    pasteEvent.clipboardData?.setData("text/plain", captionContent);
    captionEditor.dispatchEvent(pasteEvent);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    captionEditor.blur();

    // 查找并点击"分享"按钮
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const createPostDialog =
      document.querySelector('div[aria-label="创建新帖子"][role="dialog"]') ||
      document.querySelector('div[aria-label="建立新貼文"][role="dialog"]') ||
      document.querySelector('div[aria-label="Create new post"][role="dialog"]');

    console.debug("createPostDialog", createPostDialog);
    if (!createPostDialog) {
      console.debug("未找到创建新帖子对话框");
      return;
    }

    buttons = createPostDialog.querySelectorAll('div[role="button"][tabindex="0"]');
    const shareButton = Array.from(buttons).find(
      (el) => el.textContent?.includes("分享") || el.textContent?.includes("Share"),
    ) as HTMLElement;

    console.debug("shareButton", shareButton);
    if (!shareButton) {
      console.debug("未找到分享按钮");
      return;
    }

    if (data.isAutoPublish) {
      console.debug("自动发布：点击分享按钮");
      shareButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else {
      console.debug("帖子准备就绪，等待手动发布");
    }
  } catch (error) {
    console.error("InstagramDynamic 发布过程中出错:", error);
  }
}
