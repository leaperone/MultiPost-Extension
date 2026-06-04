import type { FileData, SyncData, VideoData } from "../common";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 支付宝视频发布器
 */
export async function VideoAlipay(data: SyncData): Promise<void> {
  console.log("🚀 开始支付宝视频发布流程...");
  console.log("🔍 当前页面:", window.location.href);

  try {
    // 检查是否在支付宝页面
    if (!window.location.href.includes("b.alipay.com")) {
      console.error("❌ 不在支付宝页面，当前页面:", window.location.href);
      return;
    }

    // 解析视频数据
    if (!data || !data.data) {
      console.error("❌ 缺少视频数据");
      return;
    }

    const { content, video, videoFile, title, description, tags = [], cover, horizontalCover } = data.data as VideoData;
    console.log("📝 视频数据:", {
      title: title?.substring(0, 50),
      contentLength: content?.length,
      hasVideo: !!video,
    });

    // 内联定义支付宝视频上传器类
    const AlipayVideoUploader = class AlipayVideoUploader {
      /**
       * 等待指定时间
       */
      public sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      /**
       * 等待元素出现
       */
      private async waitForElement(selector: string, timeout = 10000): Promise<Element> {
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

      private async waitForElementOptional(selector: string, timeout = 10000): Promise<Element | null> {
        return this.waitForElement(selector, timeout).catch(() => null);
      }

      private isVisible(element: Element): boolean {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        return style.display !== "none" && style.visibility !== "hidden" && htmlElement.getClientRects().length > 0;
      }

      private findVisibleInput<T extends HTMLInputElement | HTMLTextAreaElement>(selectors: string[]): T | null {
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll<T>(selector));
          const element = elements.find((item) => this.isVisible(item));
          if (element) {
            console.log("✅ 找到输入框:", selector);
            return element;
          }
        }
        return null;
      }

      private async fetchFile(fileData: FileData, fallbackType: string): Promise<File> {
        const response = await fetch(fileData.url);
        const arrayBuffer = await response.arrayBuffer();
        return new File([arrayBuffer], fileData.name, { type: fileData.type || fallbackType });
      }

      private dispatchInputEvents(element: HTMLElement): void {
        element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      }

      private async pasteText(element: HTMLElement, text: string): Promise<void> {
        const before =
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
            ? element.value
            : element.textContent || "";

        const pasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        });
        pasteEvent.clipboardData.setData("text/plain", text);
        element.dispatchEvent(pasteEvent);
        await this.sleep(100);

        const after =
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
            ? element.value
            : element.textContent || "";
        if (after !== before) {
          this.dispatchInputEvents(element);
          return;
        }

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          const start = element.selectionStart ?? element.value.length;
          const end = element.selectionEnd ?? element.value.length;
          element.value = `${element.value.slice(0, start)}${text}${element.value.slice(end)}`;
          const nextPosition = start + text.length;
          element.setSelectionRange(nextPosition, nextPosition);
        } else {
          element.textContent = `${element.textContent || ""}${text}`;
        }
        this.dispatchInputEvents(element);
      }

      private findButtonByText(text: string): HTMLElement | null {
        return (
          Array.from(document.querySelectorAll<HTMLElement>("button")).find(
            (button) => button.textContent?.trim() === text,
          ) ?? null
        );
      }

      /**
       * 填写标题
       */
      public async fillTitle(title: string): Promise<void> {
        try {
          console.log("📝 填写标题:", title);

          // 等待页面加载
          await this.sleep(3000);

          // 支付宝标题输入框选择器
          const titleSelectors = [
            'input[placeholder="一个好的标题，能获得更多人的喜欢哦"]',
            'input[placeholder*="标题"]',
            'input[placeholder*="title"]',
            'input[name*="title"]',
            'input[class*="title"]',
            'input[type="text"]',
            '.ant-input[type="text"]',
            ".ant-input",
            "#title",
            'textarea[placeholder*="标题"]',
            '.form-input[type="text"]',
            '.el-input__inner[type="text"]',
            ".alipay-input",
          ];

          const titleElement = this.findVisibleInput<HTMLInputElement | HTMLTextAreaElement>(titleSelectors);
          if (!titleElement) {
            console.log("❌ 未找到可用的标题输入框");
            return;
          }

          try {
            // 清空原有内容
            titleElement.focus();
            titleElement.select();

            // 逐字符输入模拟真实用户行为
            for (let i = 0; i < title.length; i++) {
              titleElement.value = title.substring(0, i + 1);

              // 触发输入事件
              titleElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
              await this.sleep(50);
            }

            // 触发多种事件确保框架识别
            titleElement.dispatchEvent(new Event("focus", { bubbles: true }));
            titleElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            titleElement.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            titleElement.dispatchEvent(new Event("blur", { bubbles: true }));

            // 验证设置是否成功
            console.log(`✅ 标题设置后验证: value="${titleElement.value}"`);
            if (titleElement.value === title) {
              console.log("✅ 标题填写成功");
            }
          } catch (e) {
            console.error("设置标题值时出错:", e);
          }
        } catch (error) {
          console.error("填写标题失败:", error);
          return;
        }
      }

      /**
       * 填写描述
       */
      public async fillDescriptionAndTags(description: string, tags: string[]): Promise<boolean> {
        try {
          console.log("📝 填写描述:", `${description.substring(0, 100)}...`);

          // 支付宝描述输入框选择器
          const descSelectors = [
            'textarea[placeholder="填写作品描述，让你的作品更容易被看到"]',
            'textarea[placeholder*="描述"]',
            'textarea[placeholder*="简介"]',
            'textarea[placeholder*="内容"]',
            'textarea[name*="content"]',
            'textarea[name*="desc"]',
            "textarea",
            ".ant-input",
            "#content",
            "#description",
            ".form-textarea",
            ".el-textarea__inner",
            ".alipay-textarea",
          ];

          const descElement = this.findVisibleInput<HTMLTextAreaElement>(descSelectors);
          if (!descElement) {
            console.log("❌ 未找到可用的描述输入框");
            return false;
          }

          try {
            descElement.focus();
            descElement.value = "";
            await this.pasteText(descElement, `${description} `);
            console.log("✅ 描述填写成功");

            for (const tag of tags.slice(0, 5)) {
              console.log("🏷️ 添加支付宝话题:", tag);
              descElement.focus();
              descElement.setSelectionRange(descElement.value.length, descElement.value.length);
              await this.pasteText(descElement, ` #${tag}`);
              await this.sleep(3000);

              const customTopicDiv = Array.from(document.querySelectorAll<HTMLElement>("div")).find(
                (div) => div.textContent?.trim() === "自定义话题",
              );
              if (customTopicDiv) {
                customTopicDiv.click();
                await this.sleep(1000);
              } else {
                console.log(`未找到"${tag}"的自定义话题确认项`);
              }
              await this.sleep(1000);
            }
            descElement.blur();
            return true;
          } catch (e) {
            console.error("设置描述或标签时出错:", e);
            return false;
          }
        } catch (error) {
          console.error("填写描述失败:", error);
          return false;
        }
      }

      /**
       * 上传视频文件
       */
      public async uploadVideo(videoData: VideoData["video"], sourceFile?: File): Promise<boolean> {
        try {
          console.log("📹 开始上传视频...");

          // 获取视频文件
          let file: File;
          if (sourceFile) {
            file = sourceFile;
          } else if (videoData.url) {
            const response = await fetch(videoData.url);
            const arrayBuffer = await response.arrayBuffer();
            const extension = videoData.name.split(".").pop() || "mp4";
            const fileName = `${videoData.name.replace(/\.[^/.]+$/, "")}.${extension}`;
            file = new File([arrayBuffer], fileName, { type: "video/mp4" });
          } else {
            console.error("❌ 无效的视频数据");
            return false;
          }

          console.log("📁 视频文件:", file.name, file.size, file.type);

          // 等待页面完全加载
          console.log("⏳ 等待页面加载完成...");
          await this.sleep(5000);

          // 查找上传区域
          console.log("🔍 查找支付宝上传区域...");

          const exactFileInput = (await this.waitForElementOptional(
            'input[type="file"]',
            5000,
          )) as HTMLInputElement | null;
          if (exactFileInput) {
            const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
            const targetInput =
              fileInputs.find((input) => {
                const accept = input.getAttribute("accept") || "";
                return accept.includes("video") || accept.includes("*") || accept === "";
              }) ?? exactFileInput;

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            targetInput.files = dataTransfer.files;
            targetInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            targetInput.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            console.log("✅ 文件已设置到 input[type=file]");
            return true;
          }

          const uploadSelectors = [
            ".upload-area",
            ".video-upload",
            '[class*="upload"]',
            '[class*="video"]',
            ".ant-upload",
            "#upload",
            ".upload-btn",
            'button[class*="upload"]',
            ".upload-container",
            ".el-upload",
            ".el-upload-dragger",
            ".alipay-upload",
            ".upload-wrapper",
          ];

          let uploadArea: HTMLElement | null = null;
          for (const selector of uploadSelectors) {
            const element = document.querySelector(selector) as HTMLElement | null;
            if (element && element.offsetParent !== null) {
              console.log(`✅ 找到上传区域: ${selector}`);
              uploadArea = element;
              break;
            }
          }

          if (!uploadArea) {
            console.log("❌ 未找到上传区域，尝试查找文件输入框...");

            // 直接查找文件输入框
            const fileInputs = document.querySelectorAll('input[type="file"]');
            console.log(`🔍 找到 ${fileInputs.length} 个文件输入框`);

            let targetInput: HTMLInputElement | null = null;
            fileInputs.forEach((input, index) => {
              const accept = input.getAttribute("accept") || "";
              console.log(`  输入框 ${index + 1}: accept="${accept}"`);

              // 优先查找视频文件输入框
              if (accept.includes("video") || accept.includes("*") || accept === "") {
                targetInput = input as HTMLInputElement;
                console.log(`✅ 选择输入框 ${index + 1} 作为目标`);
              }
            });

            if (targetInput) {
              // 使用DataTransfer API设置文件
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              targetInput.files = dataTransfer.files;

              // 触发change事件
              targetInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
              console.log("✅ 文件已设置到输入框");
              return true;
            }
            console.log("❌ 未找到合适的文件输入框");
            return false;
          }

          // 如果找到了上传区域，尝试点击或操作
          console.log("🔄 尝试操作上传区域...");

          // 查找上传区域内的文件输入框
          const uploadInput = uploadArea.querySelector('input[type="file"]') as HTMLInputElement;
          if (uploadInput) {
            console.log("✅ 在上传区域内找到文件输入框");

            // 创建透明的文件输入框覆盖上传区域
            const overlayInput = document.createElement("input");
            overlayInput.type = "file";
            overlayInput.accept = "video/*,.mp4,.avi,.mov,.wmv";
            overlayInput.style.position = "absolute";
            overlayInput.style.opacity = "0";
            overlayInput.style.width = "100%";
            overlayInput.style.height = "100%";
            overlayInput.style.top = "0";
            overlayInput.style.left = "0";
            overlayInput.style.zIndex = "9999";
            overlayInput.id = `alipay_upload_${Date.now()}`;

            // 设置上传区域样式以支持覆盖
            const uploadElement = uploadArea as HTMLElement;
            uploadElement.style.position = "relative";
            uploadElement.appendChild(overlayInput);

            // 设置文件
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            overlayInput.files = dataTransfer.files;

            // 触发文件选择事件
            overlayInput.dispatchEvent(new Event("focus", { bubbles: true }));
            overlayInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

            console.log("✅ 文件已设置到覆盖输入框");

            // 尝试点击上传区域（如果需要）
            if (uploadArea.tagName === "BUTTON" || uploadArea.closest("button")) {
              console.log("🖱️ 点击上传按钮...");
              ((uploadArea.closest("button") as HTMLElement) || uploadArea).click();
              await this.sleep(1000);
            }

            // 等待上传开始
            await this.waitForUploadStart();

            return true;
          }
          console.log("⚠️ 上传区域内未找到文件输入框，尝试点击上传区域...");

          // 点击上传区域触发文件选择
          const clickableElement = uploadArea.closest("button") || uploadArea.querySelector("button") || uploadArea;
          if (clickableElement) {
            console.log("🖱️ 点击可点击元素...");
            (clickableElement as HTMLElement).click();
            await this.sleep(2000);

            // 再次查找文件输入框
            const newFileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (newFileInput) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              newFileInput.files = dataTransfer.files;
              newFileInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
              console.log("✅ 文件已设置到新找到的输入框");
              return true;
            }
          }

          console.log("⚠️ 无法直接上传文件，但页面可能已经准备好了");
          return false;
        } catch (error) {
          console.error("❌ 视频上传失败:", error);
          return false;
        }
      }

      public async uploadCover(cover: FileData, label: string): Promise<boolean> {
        try {
          console.log(`🖼️ 开始上传支付宝${label}:`, cover);
          if (cover.type && !cover.type.includes("image/")) {
            console.log(`${label}不是图片，跳过上传`);
            return false;
          }

          const coverUpload = document.querySelector(
            "div.antd5-form-item-control-input-content img.absolute",
          ) as HTMLElement | null;
          console.debug("coverUpload -->", coverUpload);
          if (!coverUpload) {
            console.log(`未找到支付宝${label}封面入口`);
            return false;
          }

          coverUpload.click();
          await this.sleep(1000);

          const uploadCoverTab = Array.from(document.querySelectorAll<HTMLElement>("div[role='tab']")).find(
            (tab) => tab.textContent?.trim() === "上传封面",
          );
          console.debug("uploadCoverTab -->", uploadCoverTab);
          if (!uploadCoverTab) {
            console.log(`未找到支付宝${label}上传封面 tab`);
            return false;
          }

          uploadCoverTab.click();
          await this.sleep(1000);

          const fileInput = document.querySelector('input[accept=".jpg, .jpeg, .png"]') as HTMLInputElement | null;
          console.debug("fileInput -->", fileInput);
          if (!fileInput) {
            console.log(`未找到支付宝${label}封面文件输入框`);
            return false;
          }

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(await this.fetchFile(cover, "image/png"));
          if (dataTransfer.files.length === 0) return false;

          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          console.log(`支付宝${label}封面文件上传操作已触发`);
          await this.sleep(3000);

          const nextButton = this.findButtonByText("下一步");
          console.debug("nextButton -->", nextButton);
          nextButton?.click();

          for (let i = 0; i < 5; i++) {
            const doneButton = this.findButtonByText("完 成") || this.findButtonByText("完成");
            console.debug("doneButton -->", doneButton);
            if (doneButton) {
              doneButton.click();
              return true;
            }
            await this.sleep(1000);
          }

          console.log(`支付宝${label}封面未找到完成按钮，视为上传失败`);
          return false;
        } catch (error) {
          console.warn(`支付宝${label}封面上传失败:`, error);
          return false;
        }
      }

      public async publishIfAutoEnabled(autoPublish: boolean, videoUploaded: boolean): Promise<void> {
        if (autoPublish !== true) return;

        if (!videoUploaded) {
          console.warn("支付宝自动发布已跳过：视频未成功触发上传");
          return;
        }

        await this.sleep(5000);
        const publishButton = this.findButtonByText("确认发布");
        if (publishButton) {
          console.log("点击支付宝确认发布按钮");
          publishButton.click();
        } else {
          console.log('未找到"确认发布"按钮');
        }
      }

      /**
       * 等待上传开始
       */
      private async waitForUploadStart(): Promise<void> {
        console.log("⏳ 等待上传开始...");

        for (let i = 0; i < 30; i++) {
          await this.sleep(1000);

          // 检查上传进度指示器
          const progressSelectors = [
            '[class*="progress"]',
            '[class*="uploading"]',
            '[class*="upload-progress"]',
            ".ant-progress",
            ".progress-bar",
            ".uploading",
            ".el-progress",
            ".alipay-progress",
          ];

          for (const selector of progressSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              console.log("✅ 检测到上传进度指示器");
              return;
            }
          }

          // 检查是否有上传成功标志
          const successSelectors = ['[class*="success"]', '[class*="complete"]', '[class*="done"]', ".upload-success"];

          for (const selector of successSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              console.log("✅ 检测到上传成功标志");
              return;
            }
          }
        }

        console.log("⚠️ 未检测到明确的上传状态，但可能已开始");
      }
    };

    console.log("✅ 支付宝上传器类定义完成");

    const uploader = new AlipayVideoUploader();
    console.log("✅ 支付宝上传器实例创建完成");

    let videoUploaded = false;

    // Step 1: upload the required video.
    if (video) {
      console.log("🎥 开始上传视频...");
      videoUploaded = await uploader.uploadVideo(video, videoFile);
    } else {
      console.error("❌ 缺少视频文件");
      return;
    }

    await uploader.sleep(3000);

    // Step 2: fill the title with exact selector first, then legacy fallbacks.
    if (title) {
      console.log("📝 填写标题:", title);
      await uploader.fillTitle(title);
    }

    // Step 3: fill description and confirm custom topics from the description box.
    const descriptionText = description ?? content ?? "";
    if (descriptionText || tags.length > 0) {
      console.log("📝 填写描述:", `${descriptionText.substring(0, 100)}...`);
      await uploader.fillDescriptionAndTags(descriptionText, tags);
    }

    // Step 4: upload one cover best-effort. Cover failure must not block publish.
    const coverToUpload = cover || horizontalCover;
    if (coverToUpload) {
      await uploader.uploadCover(coverToUpload, cover ? "cover" : "horizontalCover");
    }

    await uploader.publishIfAutoEnabled(data.isAutoPublish, videoUploaded);

    console.log("🎉 支付宝视频发布流程完成");
    return;
  } catch (error) {
    console.error("💥 支付宝视频发布失败:", error);
    if (error instanceof Error) {
      console.error("错误详情:", error.stack);
    }
    return;
  }
}
