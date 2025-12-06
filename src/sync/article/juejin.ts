import type { ArticleData, SyncData } from "~sync/common";

export async function ArticleJuejin(data: SyncData) {
  console.log("Juejin Article 函数被调用");

  const articleData = data.data as ArticleData;

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
    // 等待标题输入框出现
    await waitForElement('input[placeholder="输入文章标题..."]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 设置标题
    const titleInput = document.querySelector('input[placeholder="输入文章标题..."]') as HTMLInputElement;
    if (titleInput) {
      titleInput.value = articleData.title?.slice(0, 100) || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    console.debug("titleTextarea", titleInput, titleInput?.value, articleData.title?.slice(0, 100));

    // 等待编辑器加载
    const editor = document.querySelector('div.CodeMirror-code[role="presentation"]') as HTMLElement;
    console.debug("qlEditor", editor);
    if (!editor) {
      console.debug("未找到编辑器元素");
      return;
    }

    // 聚焦编辑器并粘贴内容
    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/html", articleData.htmlContent || "");
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));

    // 等待内容渲染
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 查找发布按钮
    const buttons = document.querySelectorAll("button");
    const sendButton = Array.from(buttons).find((btn) => btn.textContent?.includes(" 发布 "));
    console.debug("sendButton", sendButton);

    if (sendButton) {
      if (data.isAutoPublish) {
        console.debug("自动发布：点击发布按钮");
        sendButton.dispatchEvent(new Event("click", { bubbles: true }));
      } else {
        console.debug("文章准备就绪，等待手动发布");
      }
    } else {
      console.debug("未找到'发送'按钮");
    }
  } catch (error) {
    console.error("Juejin Article 发布过程中出错:", error);
  }
}
