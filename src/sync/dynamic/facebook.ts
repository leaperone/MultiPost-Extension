import type { DynamicData, SyncData } from "../common";

// 允许发布图文和视频
export async function DynamicFacebook(data: SyncData) {
  console.log("Facebook 函数被调用");

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

    // 查找创建帖子按钮并触发点击事件
    const createPostButton =
      document.querySelector('div[aria-label="创建帖子"]') ||
      document.querySelector('div[aria-label="Create a post"]') ||
      document.querySelector('div[aria-label="建立貼文"]');

    console.debug("createPostButton", createPostButton);
    if (!createPostButton) {
      console.debug("未找到创建帖子按钮");
      return;
    }

    // 查找并点击照片/视频或"在想些什么"按钮
    const spans = createPostButton.querySelectorAll("span");
    console.debug("spans", spans);
    const photoButton = Array.from(spans).find(
      (span) =>
        span.textContent?.includes("照片/视频") ||
        span.textContent?.includes("Photo/video") ||
        span.textContent?.includes("相片／影片") ||
        span.textContent?.includes("在想些什么") ||
        span.textContent?.includes("What's on your mind") ||
        span.textContent?.includes("分享你的新鲜事吧"),
    );

    if (!photoButton) {
      console.error("未找到照片/视频按钮");
      return;
    }
    photoButton.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 等待编辑器出现
    await waitForElement(
      'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]',
    );

    // 查找并填写帖子内容
    const editors = document.querySelectorAll(
      'div[contenteditable="true"][role="textbox"][spellcheck="true"][tabindex="0"][data-lexical-editor="true"]',
    );
    console.debug("qlEditors", editors);

    const editor = Array.from(editors).find((el) => {
      const placeholder = el.getAttribute("aria-placeholder");
      console.debug("ariaPlaceholder", placeholder);
      return (
        placeholder?.includes("在想些什么") ||
        placeholder?.includes("What's on your mind") ||
        placeholder?.includes("分享你的新鲜事吧")
      );
    }) as HTMLElement;

    console.debug("qlEditor", editor);
    if (!editor) {
      console.debug("未找到编辑器元素");
      return;
    }

    // 填写内容
    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    const textContent = title ? `${title}\n${content}` : content || "";
    pasteEvent.clipboardData?.setData("text/plain", textContent);
    editor.dispatchEvent(pasteEvent);

    // 上传文件
    const mediaFiles = [...(images || []), ...(videos || [])];
    if (mediaFiles.length > 0) {
      const fileInputs = document.querySelectorAll(
        'input[type="file"][accept="image/*,image/heif,image/heic,video/*,video/mp4,video/x-m4v,video/x-matroska,.mkv"]',
      );
      console.debug("fileInputs", fileInputs);

      if (!fileInputs || fileInputs.length === 0) {
        console.debug("未找到文件输入元素");
        return;
      }

      // 使用最后一个 file input
      const fileInput = fileInputs[fileInputs.length - 1] as HTMLInputElement;
      const dataTransfer = new DataTransfer();

      for (const media of mediaFiles) {
        console.debug("try upload file", media);
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
      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
      const inputEvent = new Event("input", { bubbles: true });
      fileInput.dispatchEvent(inputEvent);

      console.debug("文件上传操作完成");
    }

    // 等待上传完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 查找发布按钮
    const sendButton =
      document.querySelector('div[aria-label="发帖"]') ||
      document.querySelector('div[aria-label="Post"]') ||
      document.querySelector('div[aria-label="發佈"]');

    console.debug("sendButton", sendButton);
    if (sendButton) {
      if (data.isAutoPublish) {
        console.debug("自动发布：点击发布按钮");
        sendButton.dispatchEvent(new Event("click", { bubbles: true }));
      } else {
        console.debug("帖子准备就绪，等待手动发布");
      }
    } else {
      console.debug("未找到'发送'按钮");
    }
  } catch (error) {
    console.error("FacebookDynamic 发布过程中出错:", error);
  }
}
