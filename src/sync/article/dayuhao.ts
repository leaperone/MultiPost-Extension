import type { ArticleData, SyncData } from "~sync/common";

/**
 * Dayuhao article publishing (experimental).
 *
 * DOM path. This still needs live validation on the target platform.
 */
export async function ArticleDaYuHao(data: SyncData) {
  const articleData = data.data as ArticleData;

  interface RequiredFields {
    title: boolean;
    body: boolean;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForElementOptional(selector: string, timeout = 15000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const root = document.body || document.documentElement;
      if (!root) {
        resolve(null);
        return;
      }

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          window.clearTimeout(timeoutId);
          resolve(found);
        }
      });

      const timeoutId = window.setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);

      observer.observe(root, { childList: true, subtree: true });
    });
  }

  function dispatchInputEvents(element: HTMLElement): void {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setControlValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const prototype =
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    dispatchInputEvents(element);
  }

  function getIframeEditorBody(): HTMLElement | null {
    const iframe = document.getElementById("ueditor_0") as HTMLIFrameElement | null;
    if (!iframe) return null;

    try {
      return iframe.contentDocument?.body || iframe.contentWindow?.document.body || null;
    } catch (error) {
      console.debug("Dayuhao iframe editor is not accessible:", error);
      return null;
    }
  }

  function waitForIframeBodyOptional(timeout = 15000): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeout;

      const check = () => {
        const body = getIframeEditorBody();
        if (body) {
          resolve(body);
          return;
        }

        if (Date.now() >= deadline) {
          resolve(null);
          return;
        }

        window.setTimeout(check, 250);
      };

      check();
    });
  }

  function writeHtml(editor: HTMLElement, html: string): void {
    editor.focus();
    editor.innerHTML = html;
    dispatchInputEvents(editor);
  }

  function canAutoPublish(required: RequiredFields): boolean {
    let canPublish = true;
    if (!required.title) {
      console.error("Dayuhao required field title not filled; skipping auto-publish");
      canPublish = false;
    }
    if (!required.body) {
      console.error("Dayuhao required field body not filled; skipping auto-publish");
      canPublish = false;
    }
    return canPublish;
  }

  function clickPublishIfRequested(required: RequiredFields): void {
    if (data.isAutoPublish !== true) return;
    if (!canAutoPublish(required)) return;

    const publishButton = document.querySelector(
      "div.button_publish.item.editor-btn.editor-main-btn",
    ) as HTMLElement | null;
    if (!publishButton) {
      console.debug("Dayuhao publish button not found");
      return;
    }

    publishButton.dispatchEvent(new Event("click", { bubbles: true }));
  }

  try {
    const required: RequiredFields = {
      title: false,
      body: false,
    };

    await waitForElementOptional("input#title");
    await sleep(1000);

    const titleInput = document.querySelector("input#title") as HTMLInputElement | null;
    const title = articleData.title?.slice(0, 35) || "";
    if (titleInput && title) {
      try {
        setControlValue(titleInput, title);
        required.title = true;
      } catch (error) {
        console.error("Dayuhao title write failed:", error);
      }
    } else {
      console.debug("Dayuhao title input not found or title is empty");
    }

    const editor = await waitForIframeBodyOptional();
    const htmlContent = articleData.htmlContent || "";
    if (editor && htmlContent) {
      try {
        writeHtml(editor, htmlContent);
        required.body = true;
      } catch (error) {
        console.error("Dayuhao body write failed:", error);
      }
    } else {
      console.debug("Dayuhao iframe body editor not found or content is empty");
    }

    clickPublishIfRequested(required);
  } catch (error) {
    console.error("Dayuhao article publish failed:", error);
  }
}
