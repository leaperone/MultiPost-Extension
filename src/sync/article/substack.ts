import type { ArticleData, SyncData } from "../common";

// Substack Article - 长文章发布
export async function ArticleSubstack(data: SyncData) {
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
    await waitForElement("textarea#post-title");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 填写标题
    const titleInput = document.querySelector("textarea#post-title") as HTMLTextAreaElement;
    if (titleInput) {
      titleInput.value = articleData.title || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
      console.debug("已填入标题:", articleData.title);
    }

    // 等待编辑器加载
    const editor = (await waitForElement('div[contenteditable="true"]')) as HTMLDivElement;
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
    pasteEvent.clipboardData.setData("text/html", articleData.htmlContent || "");
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    console.debug("已填入文章内容");

    // 上传封面图片
    if (articleData.cover?.url) {
      const fileInput = document.querySelector("input#cover-file") as HTMLInputElement;
      if (fileInput) {
        try {
          console.debug("正在上传封面图片:", articleData.cover.name);
          const response = await fetch(articleData.cover.url);
          const arrayBuffer = await response.arrayBuffer();
          const coverFile = new File([arrayBuffer], articleData.cover.name, { type: articleData.cover.type });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(coverFile);

          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          console.debug("封面图片上传操作完成");
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (error) {
          console.error("上传封面图片失败:", error);
        }
      } else {
        console.debug("未找到封面上传元素");
      }
    }

    // 等待内容渲染
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 查找发布按钮
    const publishButton = document.querySelector(
      "div.button_publish.item.editor-btn.editor-main-btn",
    ) as HTMLDivElement;

    if (publishButton) {
      console.debug("找到发布按钮");
      if (data.isAutoPublish) {
        console.debug("自动发布已启用，点击发布按钮");
        publishButton.dispatchEvent(new Event("click", { bubbles: true }));
      }
    } else {
      console.debug('未找到"发布"按钮');
    }
  } catch (error) {
    console.error("Substack 文章发布过程中出错:", error);
  }
}
