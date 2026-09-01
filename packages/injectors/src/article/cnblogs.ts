import type { ArticleData, FileData, SyncData } from "../types";

export async function ArticleCnblogs(data: SyncData): Promise<void> {
  const article = data.data as ArticleData;
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  async function waitForElement(selector: string, timeout = 15000): Promise<Element | null> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(250);
    }
    return null;
  }
  function cookie(name: string): string {
    const parts = `; ${document.cookie}`.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop()?.split(";").shift() || "" : "";
  }
  async function uploadImage(file: FileData): Promise<string> {
    const source = await fetch(file.url);
    if (!source.ok) throw new Error(`博客园图片读取失败：HTTP ${source.status}`);
    const blob = await source.blob();
    const form = new FormData();
    form.append("image", new File([blob], file.name, { type: file.type || blob.type }));
    const response = await fetch("https://upload.cnblogs.com/v2/images/cors-upload", {
      method: "POST",
      body: form,
      headers: { "X-XSRF-TOKEN": decodeURIComponent(cookie("XSRF-TOKEN")) },
      credentials: "include",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`博客园图片上传失败：HTTP ${response.status}`);
    const result = (await response.json()) as { imageUrl?: string; message?: string };
    if (!result.imageUrl) throw new Error(result.message || "博客园图片上传未返回地址");
    return result.imageUrl;
  }
  let markdown = article.markdownContent || article.htmlContent || "";
  for (const image of article.images || [])
    if (markdown.includes(image.url)) {
      try {
        markdown = markdown.split(image.url).join(await uploadImage(image));
      } catch (error) {
        console.error("博客园正文图片上传失败:", error);
      }
    }
  const title = (await waitForElement("input#post-title")) as HTMLInputElement | null;
  const editor = (await waitForElement("textarea#md-editor")) as HTMLTextAreaElement | null;
  if (!title || !editor) return;
  title.value = article.title || "";
  title.dispatchEvent(new Event("input", { bubbles: true }));
  title.dispatchEvent(new Event("change", { bubbles: true }));
  const summary = document.querySelector("textarea#summary") as HTMLTextAreaElement | null;
  if (summary && article.digest) {
    summary.value = article.digest;
    summary.dispatchEvent(new Event("input", { bubbles: true }));
    summary.dispatchEvent(new Event("change", { bubbles: true }));
  }
  editor.value = markdown;
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  editor.dispatchEvent(new Event("change", { bubbles: true }));
}
