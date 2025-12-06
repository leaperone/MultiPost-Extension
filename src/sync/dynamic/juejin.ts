import type { DynamicData, SyncData } from "../common";

export async function DynamicJuejin(data: SyncData) {
  console.log("Juejin Dynamic 函数被调用");

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
    const { content, images } = data.data as DynamicData;

    // 等待页面加载
    await waitForElement("div[contenteditable='true']");

    // 填写内容
    const textarea = document.querySelector("div[contenteditable='true']") as HTMLDivElement;
    console.debug("textarea", textarea);
    if (textarea) {
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData("text/plain", content || "");
      textarea.dispatchEvent(pasteEvent);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 上传图片
    if (images && images.length > 0) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      console.debug("fileInput", fileInput);

      if (fileInput) {
        const dataTransfer = new DataTransfer();
        for (let i = 0; i < images.length; i++) {
          if (i >= 9) {
            console.debug("最多上传9张图片");
            break;
          }
          const fileData = images[i];
          if (!fileData.type.startsWith("image/")) {
            console.debug("skip non-image file", fileData);
            continue;
          }
          console.debug("try upload file", fileData);
          try {
            const response = await fetch(fileData.url);
            const arrayBuffer = await response.arrayBuffer();
            const file = new File([arrayBuffer], fileData.name, { type: fileData.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error("获取文件失败:", error);
          }
        }

        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        fileInput.dispatchEvent(new Event("input", { bubbles: true }));
        console.debug("文件上传操作完成");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 查找发布按钮
    if (data.isAutoPublish) {
      const buttons = document.querySelectorAll("button");
      console.debug("buttons", buttons);
      const sendButton = Array.from(buttons).find((btn) => btn.textContent?.includes("发布"));
      console.debug("sendButton", sendButton);
      if (sendButton) {
        console.debug("自动发布：点击发布按钮");
        sendButton.click();
      } else {
        console.debug("未找到'发送'按钮");
      }
    } else {
      console.debug("帖子准备就绪，等待手动发布");
    }
  } catch (error) {
    console.error("Juejin Dynamic 发布过程中出错:", error);
  }
}
