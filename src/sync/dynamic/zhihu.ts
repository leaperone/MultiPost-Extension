import type { DynamicData, SyncData } from "../common";

export async function DynamicZhihu(data: SyncData) {
  const { title, content, images } = data.data as DynamicData;

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
    await waitForElement("input");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 查找并点击"写想法"或"发想法"按钮
    const buttons = document.querySelectorAll("button");
    const postButton = Array.from(buttons).find(
      (el) => el.textContent?.includes("写想法") || el.textContent?.includes("发想法"),
    );

    if (!postButton) {
      console.debug('未找到"写想法"元素');
      return;
    }

    console.debug("postButton", postButton);
    postButton.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 等待并填写标题
    await waitForElement('textarea[placeholder="添加标题(选填)"]');
    const titleInput = document.querySelector('textarea[placeholder="添加标题(选填)"]') as HTMLTextAreaElement;
    console.debug("titleInput", titleInput);
    if (titleInput && title) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 查找编辑器并填写内容
    const editorElement = document.querySelector('div[data-contents="true"]') as HTMLDivElement;
    console.debug("qlEditor", editorElement);
    if (!editorElement) {
      console.debug("未找到编辑器元素");
      return;
    }

    editorElement.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/plain", content || "");
    editorElement.dispatchEvent(pasteEvent);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 处理图片上传
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (i >= 9) {
          console.debug("Zhihu 最多支持 9 张，跳过");
          break;
        }
        console.debug("try upload file", image);
        const response = await fetch(image.url);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], image.name, { type: image.type });

        const imagePasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        });
        imagePasteEvent.clipboardData?.items.add(file);
        editorElement.dispatchEvent(imagePasteEvent);
      }
    }

    editorElement.dispatchEvent(new Event("input", { bubbles: true }));
    editorElement.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 等待图片上传完成（检查是否有 blob 图片正在加载）
    let loadingCount = 0;
    while (loadingCount < 30) {
      const uploadingImages = document.querySelectorAll("div.DraggableTags-tag-drag img");
      if (uploadingImages.length === 0) break;

      const loadingImg = Array.from(uploadingImages).find((img) => (img as HTMLImageElement).src.startsWith("blob"));
      console.debug("loadingImg", loadingImg);
      if (!loadingImg) break;

      await new Promise((resolve) => setTimeout(resolve, 2000));
      loadingCount++;
    }

    // 发布内容
    const allButtons = document.querySelectorAll("button");
    const sendButton = Array.from(allButtons).find((el) => el.textContent?.includes("发布"));
    console.debug("sendButton", sendButton);

    if (sendButton) {
      if (data.isAutoPublish) {
        console.debug("sendButton clicked");
        const clickEvent = new Event("click", { bubbles: true });
        sendButton.dispatchEvent(clickEvent);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.href = "https://www.zhihu.com/follow";
      }
    } else {
      console.debug('未找到"发送"按钮');
    }

    console.debug("成功填入知乎内容和图片");
  } catch (error) {
    console.error("填入知乎内容或上传图片时出错:", error);
  }
}
