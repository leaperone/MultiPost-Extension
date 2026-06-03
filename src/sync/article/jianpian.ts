import type { ArticleData, SyncData } from "~sync/common";

/**
 * 美篇/简篇文章发布(experimental,待线上验证)
 *
 * 基于 aibeike 1.6.5 的 Jianpian ARTICLE DOM 路径实现。本环境无法登录目标平台验证,
 * 选择器/流程以参考实现为准,需线上回归。
 */
export async function ArticleJianpian(data: SyncData) {
  const articleData = data.data as ArticleData;

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  async function waitForContentEditor(titleEditor: HTMLElement, timeout = 15000): Promise<HTMLElement | null> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      const editors = Array.from(document.querySelectorAll("div[contenteditable='true']")) as HTMLElement[];
      const editor = editors.find((element) => element !== titleEditor);
      if (editor) return editor;
      await sleep(500);
    }

    return null;
  }

  function pasteHtml(editor: HTMLElement, html: string) {
    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/html", html);
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  }

  try {
    const titleEditor = (await waitForElement(
      "div[contenteditable='true'][data-placeholder='点击添加标题']",
    )) as HTMLElement;
    await sleep(1000);

    titleEditor.focus();
    titleEditor.innerText = articleData.title || "";
    titleEditor.dispatchEvent(new Event("input", { bubbles: true }));
    titleEditor.dispatchEvent(new Event("change", { bubbles: true }));

    const contentEditor = await waitForContentEditor(titleEditor);
    if (!contentEditor) {
      console.debug("美篇/简篇:未找到正文编辑器元素");
      return;
    }

    pasteHtml(contentEditor, articleData.htmlContent || "");
    await sleep(3000);

    // TODO: aibeike 参考实现包含 Word 文档导入路径,MultiPost ArticleData 暂无 wordFileData,此处仅保留 HTML 粘贴路径。
    if (data.isAutoPublish === true) {
      const publishButton = Array.from(document.querySelectorAll("button, [role='button']")).find((element) =>
        element.textContent?.includes("发布"),
      ) as HTMLElement | undefined;
      if (publishButton) {
        publishButton.dispatchEvent(new Event("click", { bubbles: true }));
      } else {
        console.debug("美篇/简篇:未找到发布按钮");
      }
    }
  } catch (error) {
    console.error("美篇/简篇文章发布出错:", error);
  }
}
