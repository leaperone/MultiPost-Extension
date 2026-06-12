// Content-helper bundle entry. Desktop injects this at document_start in the
// MAIN world (via preload virtual:injector-content-helper) so MAIN-world fill
// scripts (e.g. bilibili dynamic image upload) can postMessage into it.
//
// Migrated from extension src/contents/helper.ts. The Plasmo `config` export
// (content-script matches/world metadata) is intentionally dropped: desktop
// injects this directly and esbuild tree-shakes the unused export anyway, so the
// runtime behavior (createElement hook + message listeners) is unchanged.
import { handleBilibiliImageUpload } from "./helper/bilibili";
import { handleBlueskyImageUpload, handleBlueskyVideoUpload } from "./helper/bluesky";
import { handleXiaoheiheImageUpload, handleXiaoheiheVideoUpload } from "./helper/xiaoheihe";

interface CodeMirrorElement extends HTMLDivElement {
  CodeMirror: {
    setValue: (content: string) => void;
  };
}

const originalCreateElement = document.createElement.bind(document);
export const createdInputs: HTMLInputElement[] = [];

document.createElement = (tagName, options) => {
  const element = originalCreateElement(tagName, options);

  if (tagName.toLowerCase() === "input") {
    createdInputs.push(element);
    console.log("element", element);
  }
  return element;
};

function handleMessage(event: MessageEvent) {
  const data = event.data;

  if (data.type === "BILIBILI_DYNAMIC_UPLOAD_IMAGES") {
    handleBilibiliImageUpload(event);
  } else if (data.type === "BLUESKY_VIDEO_UPLOAD") {
    handleBlueskyVideoUpload(event);
  } else if (data.type === "BLUESKY_IMAGE_UPLOAD") {
    handleBlueskyImageUpload(event);
  } else if (data.type === "V2EX_DYNAMIC_UPLOAD") {
    const editor = document.querySelector(".CodeMirror") as CodeMirrorElement;
    if (editor) {
      editor.CodeMirror.setValue(data.content);
    }
  } else if (data.type === "XIAOHEIHE_IMAGE_UPLOAD") {
    handleXiaoheiheImageUpload(event);
  } else if (data.type === "XIAOHEIHE_VIDEO_UPLOAD") {
    handleXiaoheiheVideoUpload(event);
  }
}

// 添加事件监听器
window.addEventListener("message", handleMessage);
