/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleData, FileData, SyncData } from "~sync/common";

export async function ArticleWordpress(data: SyncData) {
  console.debug("ArticleWordpress", data);

  interface WordpressMediaSize {
    source_url?: string;
  }

  interface WordpressMediaUploadResult {
    source_url?: string;
    media_details?: {
      sizes?: Record<string, WordpressMediaSize>;
    };
  }

  function prepareArticleContent(articleData: ArticleData): { articleData: ArticleData; contentIsHtml: boolean } {
    if (articleData.htmlContent) {
      return {
        articleData: { ...articleData, htmlContent: articleData.htmlContent },
        contentIsHtml: true,
      };
    }

    return {
      // TODO: Markdown fallback is sent as-is because this path does not render markdown.
      articleData: { ...articleData, htmlContent: articleData.markdownContent || "" },
      contentIsHtml: false,
    };
  }

  function getMediaSourceUrl(result: WordpressMediaUploadResult): string | undefined {
    const sizes = result.media_details?.sizes;
    return (
      result.source_url ||
      sizes?.large?.source_url ||
      sizes?.full?.source_url ||
      sizes?.medium?.source_url ||
      sizes?.thumbnail?.source_url
    );
  }

  // Upload media through the classic editor endpoint.
  async function uploadMediaClassic(fileData: FileData, postId: string): Promise<string | undefined> {
    console.debug("uploadMediaClassic", fileData);

    // Read the upload nonce from the classic editor page.
    const uploadNonceMatch = document.body.innerHTML.match(/{"action":"upload-attachment","_wpnonce":"([^"]+)"}/);
    const uploadNonce = uploadNonceMatch?.[1];
    console.debug("uploadAttachmentNonce", uploadNonce);

    const uploadUrl = `${window.location.origin}/wp-admin/async-upload.php`;

    // Fetch the local/blob file content before building the WordPress upload form.
    const blob = await (await fetch(fileData.url)).blob();
    const file = new File([blob], fileData.name, { type: fileData.type });

    const formData = new FormData();
    formData.append("name", fileData.name);
    formData.append("action", "upload-attachment");
    formData.append("_wpnonce", uploadNonce);
    formData.append("post_id", postId);
    formData.append("async-upload", file);

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {},
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.debug("Image upload result:", result);

      return result?.data?.sizes?.large?.url || result?.data?.sizes?.full?.url || result?.data?.sizes?.medium?.url;
    } catch (error) {
      console.debug("Error uploading image:", error);
      return undefined;
    }
  }

  // Upload media through the REST API endpoint.
  async function uploadMediaApi(fileData: FileData, postId: string): Promise<string | undefined> {
    console.debug("uploadMediaApi", fileData);

    // Read the REST nonce from the block editor page.
    const nonceMatch = document.body.innerHTML.match(/wp\.apiFetch\.createNonceMiddleware\(([^)]+)\)/);
    const nonceQuote = nonceMatch?.[1];
    console.debug("nonceQuote", nonceQuote);
    const nonce = nonceQuote?.match(/"([^"]+)"/)?.[1];
    console.debug("nonce", nonce);

    const uploadUrl = `${window.location.origin}/wp-json/wp/v2/media?_locale=user`;

    const blob = await (await fetch(fileData.url)).blob();
    const file = new File([blob], fileData.name, { type: fileData.type });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("post", postId);

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
          "x-wp-nonce": nonce,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as WordpressMediaUploadResult;
      console.debug("Image upload result:", JSON.stringify(result));

      return getMediaSourceUrl(result);
    } catch (error) {
      console.debug("Error uploading image:", error);
      return undefined;
    }
  }

  // Upload and replace inline article images.
  async function processContent(
    articleData: ArticleData,
    postId: string,
    isClassicEditor: boolean,
    contentIsHtml: boolean,
  ): Promise<ArticleData> {
    if (!contentIsHtml || !articleData.htmlContent) {
      return articleData;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(articleData.htmlContent, "text/html");
    const images = doc.getElementsByTagName("img");
    const imageFiles = articleData.images ?? [];

    for (const img of Array.from(images)) {
      const originalSrc = img.getAttribute("src");
      if (originalSrc) {
        console.debug("try replace image:", originalSrc);
        const fileData = imageFiles.find((file) => file.url === originalSrc);

        if (fileData) {
          const newUrl = isClassicEditor
            ? await uploadMediaClassic(fileData, postId)
            : await uploadMediaApi(fileData, postId);

          console.debug("newUrl", newUrl);
          if (newUrl) {
            img.setAttribute("src", newUrl);
          }
        }
      }
    }

    console.log("doc.body.innerHTML", doc.body.innerHTML);
    articleData.htmlContent = doc.body.innerHTML;
    console.log("articleData.htmlContent", articleData.htmlContent);
    return articleData;
  }

  // Publish the draft through the classic editor heartbeat autosave endpoint.
  async function publishDraftClassic(articleData: ArticleData, postId: string): Promise<boolean> {
    console.debug("publishDraftClassic");

    const ajaxUrl = `${window.location.origin}/wp-admin/admin-ajax.php`;
    const formData = new FormData();

    formData.append("data[wp_autosave][post_id]", postId);
    formData.append("data[wp_autosave][post_type]", "post");
    formData.append("data[wp_autosave][post_author]", "1");
    formData.append("data[wp_autosave][post_title]", articleData.title);
    formData.append("data[wp_autosave][content]", articleData.htmlContent);
    formData.append("data[wp_autosave][excerpt]", "");
    formData.append("data[wp_autosave][catslist]", "");
    formData.append("data[wp_autosave][comment_status]", "open");
    formData.append("data[wp_autosave][ping_status]", "open");

    // Read the classic editor nonces needed by heartbeat autosave.
    const wpNonce = document.querySelector("#_wpnonce") as HTMLInputElement;
    formData.append("data[wp_autosave][_wpnonce]", wpNonce?.value);
    formData.append("data[wp-refresh-post-nonces][post_id]", postId);

    const heartbeatNonce = document.body.innerHTML.match(/heartbeatSettings = \{"nonce":"([^"]+)"/)?.[1];
    formData.append("_nonce", heartbeatNonce);
    formData.append("action", "heartbeat");
    formData.append("screen_id", "post");
    formData.append("has_focus", "false");
    formData.append("interval", "60");

    try {
      const response = await fetch(ajaxUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.debug("result", result);

      return result?.wp_autosave?.success || false;
    } catch (error) {
      console.debug("Error publishing draft:", error);
      return false;
    }
  }

  // Publish the draft through the REST API endpoint.
  async function publishDraftApi(articleData: ArticleData, postId: string): Promise<boolean> {
    console.debug("publishDraftApi");

    const nonceMatch = document.body.innerHTML.match(/wp\.apiFetch\.createNonceMiddleware\(([^)]+)\)/);
    const nonceQuote = nonceMatch?.[1];
    const nonce = nonceQuote?.match(/"([^"]+)"/)?.[1];

    const apiUrl = `${window.location.origin}/wp-json/wp/v2/posts/${postId}?_locale=user`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({
          id: postId,
          title: articleData.title,
          content: articleData.htmlContent,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-wp-nonce": nonce,
          "x-http-method-override": "PUT",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.debug("result", result);

      return !!result?.id;
    } catch (error) {
      console.debug("Error publishing draft:", error);
      return false;
    }
  }

  // Main flow.
  try {
    const postIdInput = document.querySelector("input#post_ID") as HTMLInputElement;
    const postId = postIdInput?.value;

    if (!postId) {
      console.debug("WordPress post ID not found; skipping article publish");
      return;
    }

    const isClassicEditor = !!document.querySelector("input#title");

    const articleData = data.data as ArticleData;
    const { articleData: preparedData, contentIsHtml } = prepareArticleContent(articleData);
    const processedData = await processContent(preparedData, postId, isClassicEditor, contentIsHtml);

    console.debug("processedData", processedData);

    const success = isClassicEditor
      ? await publishDraftClassic(processedData, postId)
      : await publishDraftApi(processedData, postId);

    if (!success) {
      throw new Error("发布草稿失败");
    }

    if (!data.isAutoPublish) {
      window.location.href = `/wp-admin/post.php?post=${postId}&action=edit`;
    }
  } catch (error) {
    console.debug("发布文章失败:", error);
    throw error;
  }
}
