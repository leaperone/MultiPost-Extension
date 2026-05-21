import type { ArticleData, FileData, SyncData } from "../common";

export async function ArticleOSChina(data: SyncData) {
  function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const exist = document.querySelector(selector);
      if (exist) {
        resolve(exist);
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
        reject(new Error(`元素 "${selector}" 在 ${timeout}ms 内未出现`));
      }, timeout);
    });
  }

  // OSChina 自己的图片中转上传，返回站内 CDN URL
  async function uploadImage(file: FileData): Promise<string | null> {
    try {
      const blob = await (await fetch(file.url)).blob();
      const form = new FormData();
      form.append("file", new File([blob], file.name, { type: file.type || blob.type }));

      const resp = await fetch("https://apiv1.oschina.net/oschinapi/ai/creation/project/uploadDetail", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as { result?: string };
      return json?.result || null;
    } catch (e) {
      console.warn("OSChina 图片上传失败", file.url, e);
      return null;
    }
  }

  async function rewriteImages(html: string, images: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const imgs = Array.from(doc.getElementsByTagName("img"));
    for (let i = 0; i < imgs.length; i++) {
      const src = imgs[i].getAttribute("src");
      if (!src) continue;
      const match = images.find((f) => f.url === src);
      if (!match) continue;
      const newUrl = await uploadImage(match);
      if (newUrl) imgs[i].setAttribute("src", newUrl);
    }
    return doc.body.innerHTML;
  }

  try {
    const { title, htmlContent, images = [] } = data.data as ArticleData;

    await waitForElement('input[placeholder*="标题"], textarea[placeholder*="标题"]');

    const titleEl = document.querySelector('input[placeholder*="标题"], textarea[placeholder*="标题"]') as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (titleEl && title) {
      titleEl.focus();
      titleEl.value = title;
      titleEl.dispatchEvent(new Event("input", { bubbles: true }));
      titleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLDivElement | null;
    if (!editor) {
      console.error("未找到 OSChina 正文编辑器");
      return;
    }
    const processed = await rewriteImages(htmlContent || "", images);
    editor.focus();
    const paste = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    paste.clipboardData?.setData("text/html", processed);
    editor.dispatchEvent(paste);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (error) {
    console.error("OSChina 文章发布失败:", error);
  }
}
