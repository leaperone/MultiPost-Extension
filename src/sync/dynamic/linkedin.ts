import type { DynamicData, SyncData } from "../common";

// 只能图片或视频，不能同时上传
export async function DynamicLinkedin(data: SyncData) {
  console.log("LinkedIn 函数被调用");

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
        reject(new Error(`元素未找到 "${selector}" 在 ${timeout}ms 内`));
      }, timeout);
    });
  }

  // 与 waitForElement 相同,但在指定 root（如 Shadow DOM 的 shadowRoot）内查找
  function waitForElementInRoot(selector: string, root: Document | ShadowRoot, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const existing = root.querySelector(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = root.querySelector(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      observer.observe(root, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`元素未找到 "${selector}" 在 ${timeout}ms 内`));
      }, timeout);
    });
  }

  try {
    const { title, content, images, videos } = data.data as DynamicData;

    // 触发按钮:LinkedIn 改版后 share-box 可能被 web component 包了一层,
    // 优先尝试 componentkey 属性(更稳定),回退到旧的 share-box-feed-entry 类名
    await waitForElement("div[componentkey='draft-text-replaceable-component'], div.share-box-feed-entry__top-bar");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const triggerButton = (document.querySelector("div[componentkey='draft-text-replaceable-component']") ||
      document.querySelector("div.share-box-feed-entry__top-bar > button")) as HTMLElement | null;
    console.debug("triggerButton", triggerButton);
    if (!triggerButton) {
      console.debug("未找到触发按钮");
      return;
    }
    triggerButton.click();

    // LinkedIn 改版后把发布框放进了 div#interop-outlet 的 Shadow DOM,
    // 编辑器/发布按钮都在 shadowRoot 内,主 document 查不到。
    // 取 shadowRoot 作为查询根;旧版无 shadow DOM 时回退到 document。
    const outlet = (await waitForElement("div#interop-outlet", 5000).catch(() => null)) as HTMLElement | null;
    const root: Document | ShadowRoot = outlet?.shadowRoot ?? document;

    // 等待编辑器出现
    await waitForElementInRoot('div.ql-editor[contenteditable="true"]', root);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 编辑器:不依赖 data-placeholder 文案,直接取 contenteditable 的 ql-editor
    const editor = root.querySelector('div.ql-editor[contenteditable="true"]') as HTMLDivElement | null;

    console.debug("qlEditor", editor);
    if (!editor) {
      console.debug("未找到编辑器元素");
      return;
    }

    // 处理内容输入
    editor.focus();
    const textContent = title ? `${title}\n${content}` : content || "";
    editor.innerText = textContent;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 处理图片和视频上传
    const mediaFiles = [...(images || []), ...(videos || [])];
    if (mediaFiles.length > 0) {
      const dataTransfer = new DataTransfer();

      for (let i = 0; i < mediaFiles.length; i++) {
        if (i >= 8) {
          console.debug("Linkedin 最多支持 8 张 ，跳过");
          break;
        }
        const fileData = mediaFiles[i];
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

      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });
      editor.dispatchEvent(pasteEvent);
      console.debug("文件上传操作完成");
    }

    // 等待上传完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理发布按钮
    const sendButton = root.querySelector("button.share-actions__primary-action") as HTMLButtonElement;
    console.debug("sendButton", sendButton);
    if (sendButton) {
      if (data.isAutoPublish) {
        console.debug("自动发布：点击发布按钮");
        sendButton.click();
      } else {
        console.debug("帖子准备就绪，等待手动发布");
      }
    } else {
      console.debug("未找到'发送'按钮");
    }
  } catch (error) {
    console.error("LinkedIn 发布过程中出错:", error);
  }
}
