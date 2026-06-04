import type { SyncData, VideoData } from "../common";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 车家号视频上传器 - 基于AHVP系统
 */
// 立即导出并设置到全局作用域
export const ChejiahaoVideoUploader = class ChejiahaoVideoUploader {
  private uploader: any = null;
  private uploadToken = "";

  /**
   * 等待元素出现
   */
  private waitForElement(selector: string, timeout = 10000): Promise<Element> {
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

  /**
   * 等待指定时间
   */
  public sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取上传凭证
   */
  private async getUploadToken(): Promise<string> {
    try {
      console.log("🔑 获取车家号上传凭证...");

      // 尝试从已有的全局变量获取
      if ((window as any).browser_0_?.params?.callback) {
        console.log("✅ 从全局变量获取上传凭证");
        return (window as any).browser_0_.params.callback;
      }

      // 尝试从页面API获取
      const response = await fetch(
        "https://creator.autohome.com.cn/openapi/content-api/video/get_upload_info?bizType=1",
        {
          method: "GET",
          credentials: "include",
          headers: {
            accept: "application/json;charset=UTF-8",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ 获取上传凭证成功:", data);
        this.uploadToken = data.token || "";
        return this.uploadToken;
      }

      console.log("⚠️ 无法获取上传凭证，使用默认值");
      return "";
    } catch (error) {
      console.error("❌ 获取上传凭证失败:", error);
      return "";
    }
  }

  /**
   * 初始化AHVP上传器
   */
  private async initAHVPUploader(): Promise<boolean> {
    try {
      console.log("🚀 初始化AHVP上传器...");

      // 等待AHVP系统加载
      if (!(window as any).AHVP) {
        console.log("🔄 等待AHVP系统加载...");
        let attempts = 0;
        while (!(window as any).AHVP && attempts < 30) {
          await this.sleep(1000);
          attempts++;
        }
      }

      const AHVP = (window as any).AHVP;
      if (!AHVP) {
        console.error("❌ AHVP系统未加载");
        return false;
      }

      console.log("✅ AHVP系统已加载");

      // 获取上传凭证
      const token = await this.getUploadToken();

      // 如果已有上传器实例，先取消
      if ((window as any).browser_0_) {
        try {
          (window as any).browser_0_.cancel();
        } catch (_e) {
          console.log("🔄 清理旧的上传器实例");
        }
      }

      // 创建新的上传器
      this.uploader = AHVP.newUploader({
        h5: true,
        target: "browser_0",
        dragtarget: "browser_0",
        waitstart: 1,
        param: "lt=30&gt=3",
        iw: 0,
        provider: "autohomeMulti",
        callback: token,
        mt: 1,
      });

      if (this.uploader) {
        // 存储到全局变量
        (window as any).browser_0_ = this.uploader;
        console.log("✅ AHVP上传器创建成功");
        return true;
      }

      console.error("❌ AHVP上传器创建失败");
      return false;
    } catch (error) {
      console.error("❌ 初始化AHVP上传器失败:", error);
      return false;
    }
  }

  /**
   * 模拟点击上传区域触发文件选择
   */
  private async triggerFileSelect(): Promise<void> {
    try {
      console.log("🖱️ 触发文件选择...");

      // 查找上传区域元素
      const uploadSelectors = ["#browser_0", ".upload-area", ".ant-upload", '[class*="upload"]', ".video-upload-area"];

      for (const selector of uploadSelectors) {
        const element = document.querySelector(selector) as HTMLElement | null;
        if (element) {
          console.log(`✅ 找到上传区域: ${selector}`);
          element.click();
          await this.sleep(500);
          return;
        }
      }

      console.log("❌ 未找到上传区域");
      return;
    } catch (error) {
      console.error("❌ 触发文件选择失败:", error);
      return;
    }
  }

  /**
   * 填写标题
   */
  public async fillTitle(title: string): Promise<void> {
    try {
      console.log("📝 填写标题:", title);

      const titleSelectors = [
        "#title",
        'input[placeholder*="合适的标题能帮你获得更多流量哦"]',
        'input[placeholder*="标题"]',
        'input[placeholder*="必填"]',
        'input[type="text"]',
        '.ant-input[type="text"]',
      ];

      for (const selector of titleSelectors) {
        const titleElement = document.querySelector(selector) as HTMLInputElement;
        if (titleElement) {
          console.log("✅ 找到标题输入框:", selector);

          titleElement.focus();
          titleElement.value = title;

          titleElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          titleElement.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

          console.log("✅ 标题填写成功");
          return;
        }
      }

      console.log("❌ 未找到标题输入框");
      return;
    } catch (error) {
      console.error("填写标题失败:", error);
      return;
    }
  }

  /**
   * 填写描述
   */
  public async fillDescription(description: string): Promise<void> {
    try {
      console.log("📝 填写描述:", description);

      const descSelectors = [
        "#summary",
        'textarea[placeholder*="快来简单描述下你的作品吧"]',
        'textarea[placeholder*="描述"]',
        'textarea[placeholder*="简介"]',
        "textarea",
        ".ant-input",
      ];

      for (const selector of descSelectors) {
        const descElement = document.querySelector(selector) as HTMLTextAreaElement;
        if (descElement) {
          console.log("✅ 找到描述输入框:", selector);

          descElement.focus();
          descElement.value = description;

          descElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
          descElement.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

          console.log("✅ 描述填写成功");
          return;
        }
      }

      console.log("❌ 未找到描述输入框");
      return;
    } catch (error) {
      console.error("填写描述失败:", error);
      return;
    }
  }

  /**
   * 上传视频文件 - 基于AHVP系统
   */
  public async uploadVideo(videoData: any): Promise<void> {
    try {
      console.log("📹 开始上传视频...");

      // 获取视频文件
      let file: File;
      if (videoData.videoFile) {
        file = videoData.videoFile;
      } else if (videoData.url) {
        const response = await fetch(videoData.url);
        const arrayBuffer = await response.arrayBuffer();
        const extension = videoData.name.split(".").pop() || "mp4";
        const fileName = `${videoData.name.replace(/\.[^/.]+$/, "")}.${extension}`;
        file = new File([arrayBuffer], fileName, { type: "video/mp4" });
      } else {
        console.error("❌ 无效的视频数据");
        return;
      }

      console.log("📁 视频文件:", file.name, file.size, file.type);

      // 初始化AHVP上传器
      const initSuccess = await this.initAHVPUploader();
      if (!initSuccess) {
        console.error("❌ AHVP上传器初始化失败");
        return;
      }

      // 查找文件输入框并设置文件
      const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      let targetInput: HTMLInputElement | null = null;

      for (const input of fileInputs) {
        const accept = input.getAttribute("accept") || "";
        const id = input.id || "";

        // 优先查找browser_0相关的输入框
        if (id.includes("browser_0") || !accept.includes("image") || accept.includes("video")) {
          targetInput = input;
          console.log(`✅ 找到目标输入框: ${id || "unnamed"}`);
          break;
        }
      }

      if (!targetInput) {
        console.log("🔄 创建新的文件输入框");
        targetInput = document.createElement("input");
        targetInput.type = "file";
        targetInput.accept = "video/*";
        targetInput.style.display = "none";
        targetInput.id = "multipost_chejiahao_video_input";
        document.body.appendChild(targetInput);
      }

      // 使用DataTransfer API设置文件
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      targetInput.files = dataTransfer.files;

      console.log("✅ 文件设置到输入框成功");

      // 触发文件选择
      targetInput.dispatchEvent(new Event("change", { bubbles: true }));

      // 如果有AHVP上传器，尝试直接添加文件
      if (this.uploader && typeof this.uploader.addFile === "function") {
        console.log("🔄 通过AHVP上传器添加文件");
        try {
          this.uploader.addFile(file);
          console.log("✅ 文件已添加到AHVP上传器");
        } catch (_error) {
          console.log("⚠️ AHVP添加文件失败，使用标准方式");
        }
      }

      // 等待上传开始
      console.log("⏳ 等待上传开始...");
      let uploadStarted = false;

      for (let i = 0; i < 30; i++) {
        await this.sleep(1000);

        // 检查是否有进度条出现
        const progressBars = document.querySelectorAll('[class*="progress"], .comps_uploadProgress__r8kTw');
        if (progressBars.length > 0) {
          console.log("✅ 检测到上传进度条，上传已开始");
          uploadStarted = true;
          break;
        }

        // 检查表单是否可用（上传完成的标志）
        const titleInput = document.querySelector("#title") as HTMLElement;
        if (titleInput && titleInput.offsetParent !== null) {
          console.log("✅ 检测到表单可用，可能上传已完成");
          uploadStarted = true;
          break;
        }
      }

      if (!uploadStarted) {
        console.log("⚠️ 未检测到明确的上传开始信号，但文件已设置");
      }

      console.log("🎉 视频文件上传流程完成");
      return;
    } catch (error) {
      console.error("❌ 视频上传失败:", error);
      return;
    }
  }

  /**
   * 自动发布
   */
  public async autoPublish(): Promise<void> {
    try {
      console.log("🚀 开始自动发布...");

      const publishSelectors = [
        'button:contains("发布")',
        'button[title*="发布"]',
        ".publish-btn",
        "#publishBtn",
        ".ant-btn-primary",
        'button[type="submit"]',
      ];

      // 由于CSS选择器不支持:contains，使用JavaScript查找
      const buttons = document.querySelectorAll("button");
      for (const button of buttons) {
        const textContent = button.textContent?.trim() || "";
        if (textContent.includes("发布")) {
          console.log("✅ 找到发布按钮:", textContent);
          button.click();
          await this.sleep(2000);
          console.log("✅ 发布按钮点击成功");
          return;
        }
      }

      for (const selector of publishSelectors) {
        if (!selector.includes(":contains")) {
          const publishButton = document.querySelector(selector) as HTMLButtonElement;
          if (publishButton) {
            console.log("✅ 找到发布按钮:", selector);
            publishButton.click();
            await this.sleep(2000);
            console.log("✅ 发布按钮点击成功");
            return;
          }
        }
      }

      console.log("❌ 未找到发布按钮");
      return;
    } catch (error) {
      console.error("自动发布失败:", error);
      return;
    }
  }
};

// 确保类在全局作用域中可用，以便在内容脚本中访问
if (typeof window !== "undefined") {
  (window as any).ChejiahaoVideoUploader = ChejiahaoVideoUploader;
}

/**
 * 车家号视频发布器 - 基于AHVP系统
 */
export async function VideoChejiahao(data: SyncData): Promise<void> {
  console.log("🚀 开始车家号视频发布流程...");
  console.log("🔍 当前页面:", window.location.href);

  try {
    // 检查是否在车家号页面
    if (!window.location.href.includes("creator.autohome.com.cn")) {
      console.error("❌ 不在车家号页面，当前页面:", window.location.href);
      return;
    }

    // 解析视频数据
    if (!data || !data.data) {
      console.error("❌ 缺少视频数据");
      return;
    }

    const { content, video, title, description, cover } = data.data as VideoData;
    console.log("📝 视频数据:", {
      title: title?.substring(0, 50),
      contentLength: content?.length,
      hasVideo: !!video,
      hasCover: !!cover,
      isAutoPublish: data.isAutoPublish,
    });

    // 内联定义车家号视频上传器类，避免模块导入问题
    const ChejiahaoVideoUploaderInline = class ChejiahaoVideoUploader {
      private uploader: any = null;
      private uploadToken = "";
      private usedHardcodedUploadFallback = false;

      /**
       * 等待指定时间
       */
      public sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      /**
       * 获取上传凭证
       */
      private async getUploadToken(): Promise<string> {
        try {
          console.log("🔑 获取车家号上传凭证...");

          // 尝试从已有的全局变量获取
          if ((window as any).browser_0_?.params?.callback) {
            console.log("✅ 从全局变量获取上传凭证");
            return (window as any).browser_0_.params.callback;
          }

          // 尝试从页面API获取
          const response = await fetch(
            "https://creator.autohome.com.cn/openapi/content-api/video/get_upload_info?bizType=1",
            {
              method: "GET",
              credentials: "include",
              headers: {
                accept: "application/json;charset=UTF-8",
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            console.log("✅ 获取上传凭证成功:", data);
            this.uploadToken = data.token || "";
            return this.uploadToken;
          }

          console.log("⚠️ 无法获取上传凭证，使用默认值");
          return "";
        } catch (error) {
          console.error("❌ 获取上传凭证失败:", error);
          return "";
        }
      }

      /**
       * 初始化AHVP上传器
       */
      private async initAHVPUploader(): Promise<boolean> {
        try {
          console.log("🚀 初始化AHVP上传器...");

          // 等待AHVP系统加载
          if (!(window as any).AHVP) {
            console.log("🔄 等待AHVP系统加载...");
            let attempts = 0;
            while (!(window as any).AHVP && attempts < 30) {
              await this.sleep(1000);
              attempts++;
            }
          }

          const AHVP = (window as any).AHVP;
          if (!AHVP) {
            console.error("❌ AHVP系统未加载");
            return false;
          }

          console.log("✅ AHVP系统已加载");

          // 获取上传凭证
          const token = await this.getUploadToken();

          // 如果已有上传器实例，先取消
          if ((window as any).browser_0_) {
            try {
              (window as any).browser_0_.cancel();
            } catch (_e) {
              console.log("🔄 清理旧的上传器实例");
            }
          }

          // 创建新的上传器
          this.uploader = AHVP.newUploader({
            h5: true,
            target: "browser_0",
            dragtarget: "browser_0",
            waitstart: 1,
            param: "lt=30&gt=3",
            iw: 0,
            provider: "autohomeMulti",
            callback: token,
            mt: 1,
          });

          if (this.uploader) {
            // 存储到全局变量
            (window as any).browser_0_ = this.uploader;
            console.log("✅ AHVP上传器创建成功");
            return true;
          }

          console.error("❌ AHVP上传器创建失败");
          return false;
        } catch (error) {
          console.error("❌ 初始化AHVP上传器失败:", error);
          return false;
        }
      }

      /**
       * 填写标题
       */
      public async fillTitle(title: string): Promise<void> {
        try {
          console.log("📝 填写标题:", title);

          // 等待页面加载
          await this.sleep(3000);

          // 直接使用找到的title输入框
          const titleElement = document.querySelector("#title") as HTMLInputElement;
          if (titleElement) {
            console.log("✅ 找到标题输入框: #title");
            console.log("  - placeholder:", titleElement.placeholder);
            console.log("  - 可见性:", titleElement.offsetParent !== null ? "可见" : "隐藏");

            try {
              // 方法1: 直接设置值
              titleElement.value = title;

              // 方法2: 使用原生值设置器
              const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
              if (nativeSetter) {
                nativeSetter.call(titleElement, title);
              }

              // 方法3: 模拟用户输入
              titleElement.focus();

              // 清空原有内容
              titleElement.select();

              // 逐字符输入模拟真实用户行为
              for (let i = 0; i < title.length; i++) {
                const _char = title[i];
                titleElement.value = title.substring(0, i + 1);

                // 触发输入事件
                titleElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
                await this.sleep(50); // 短暂延迟模拟输入
              }

              // 触发多种事件确保React等框架能识别
              titleElement.dispatchEvent(new Event("focus", { bubbles: true }));
              titleElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
              titleElement.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
              titleElement.dispatchEvent(new Event("blur", { bubbles: true }));

              // 验证设置是否成功
              console.log(`✅ 标题设置后验证: value="${titleElement.value}"`);
              if (titleElement.value === title) {
                console.log("✅ 标题填写成功");
                return;
              }
              console.log("⚠️ 标题值不匹配，继续...");
            } catch (e) {
              console.error("设置标题值时出错:", e);
            }
          } else {
            console.log("❌ 未找到#title输入框");
          }

          console.log("❌ 标题填写失败，但继续流程");
          return;
        } catch (error) {
          console.error("填写标题失败:", error);
          return;
        }
      }

      /**
       * 自动勾选原创和首发
       */
      public async checkOriginalAndFirst(): Promise<void> {
        try {
          console.log("✅ 开始勾选原创和首发...");

          // 等待页面加载
          await this.sleep(2000);

          // 勾选原创
          const originalCheckbox = document.querySelector("#isOriginal") as HTMLInputElement;
          if (originalCheckbox) {
            if (!originalCheckbox.checked) {
              originalCheckbox.click();
              console.log("✅ 已勾选原创");
            } else {
              console.log("✅ 原创已勾选");
            }
          } else {
            console.log("❌ 未找到原创复选框");
          }

          // 勾选首发
          const firstCheckbox = document.querySelector("#isFirst") as HTMLInputElement;
          if (firstCheckbox) {
            if (!firstCheckbox.checked) {
              firstCheckbox.click();
              console.log("✅ 已勾选首发");
            } else {
              console.log("✅ 首发已勾选");
            }
          } else {
            console.log("❌ 未找到首发复选框");
          }

          return;
        } catch (error) {
          console.error("❌ 勾选原创和首发失败:", error);
          return;
        }
      }

      /**
       * 填写描述
       */
      public async fillDescription(description: string): Promise<void> {
        try {
          console.log("📝 填写描述:", description);

          const descSelectors = [
            "#summary",
            'textarea[placeholder*="快来简单描述下你的作品吧"]',
            'textarea[placeholder*="描述"]',
            'textarea[placeholder*="简介"]',
            "textarea",
            ".ant-input",
          ];

          for (const selector of descSelectors) {
            const descElement = document.querySelector(selector) as HTMLTextAreaElement;
            if (descElement) {
              console.log("✅ 找到描述输入框:", selector);

              descElement.focus();
              descElement.value = description;

              descElement.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
              descElement.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

              console.log("✅ 描述填写成功");
              return;
            }
          }

          console.log("❌ 未找到描述输入框");
          return;
        } catch (error) {
          console.error("填写描述失败:", error);
          return;
        }
      }

      private async waitForElementOptional(selector: string, timeout = 10000): Promise<Element | null> {
        return new Promise((resolve) => {
          const element = document.querySelector(selector);
          if (element) {
            resolve(element);
            return;
          }

          const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
              observer.disconnect();
              resolve(element);
            }
          });

          if (!document.body) {
            resolve(null);
            return;
          }

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });

          setTimeout(() => {
            observer.disconnect();
            resolve(null);
          }, timeout);
        });
      }

      private async waitForElementInRootOptional(
        selector: string,
        root: Document | ShadowRoot,
        timeout = 10000,
      ): Promise<Element | null> {
        return new Promise((resolve) => {
          const element = root.querySelector(selector);
          if (element) {
            resolve(element);
            return;
          }

          const observeRoot = root instanceof Document ? root.body : root;
          if (!observeRoot) {
            resolve(null);
            return;
          }

          const observer = new MutationObserver(() => {
            const element = root.querySelector(selector);
            if (element) {
              observer.disconnect();
              resolve(element);
            }
          });

          observer.observe(observeRoot, {
            childList: true,
            subtree: true,
          });

          setTimeout(() => {
            observer.disconnect();
            resolve(null);
          }, timeout);
        });
      }

      private dispatchInputEvents(element: HTMLElement): void {
        element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      }

      private isElementVisible(element: HTMLElement): boolean {
        return !!(element.offsetParent || element.getClientRects().length > 0);
      }

      private findExactTextControl(root: ParentNode, text: string): HTMLElement | null {
        return (
          Array.from(root.querySelectorAll<HTMLElement>("button, a, span")).find(
            (element) => element.textContent?.trim() === text && this.isElementVisible(element),
          ) || null
        );
      }

      private findCoverEditButton(): HTMLElement | null {
        const coverContainerSelectors = [
          "[class*='cover']",
          "[class*='Cover']",
          "[id*='cover']",
          "[id*='Cover']",
          "[class*='poster']",
          "[class*='Poster']",
          "[id*='poster']",
          "[id*='Poster']",
          "[class*='thumb']",
          "[class*='Thumb']",
          "[id*='thumb']",
          "[id*='Thumb']",
        ];

        for (const container of document.querySelectorAll<HTMLElement>(coverContainerSelectors.join(","))) {
          const editButton = this.findExactTextControl(container, "编辑");
          if (editButton) return editButton;
        }

        const coverTextElements = Array.from(document.querySelectorAll<HTMLElement>("label, div, span, p")).filter(
          (element) => {
            const text = element.textContent?.trim() || "";
            return text.includes("封面") && text.length <= 300;
          },
        );

        for (const element of coverTextElements) {
          let container: HTMLElement | null = element;
          let depth = 0;

          while (container && container !== document.body && depth < 4) {
            const text = container.textContent || "";
            const controls = container.querySelectorAll("button, a, span");

            if (text.includes("封面") && text.length <= 2000 && controls.length <= 20) {
              const editButton = this.findExactTextControl(container, "编辑");
              if (editButton) return editButton;
            }

            container = container.parentElement;
            depth++;
          }
        }

        return null;
      }

      private closeCoverEditor(iframeDocument?: Document | null): void {
        const closeSelectors = [
          "button[aria-label='Close']",
          "button[aria-label='关闭']",
          ".ant-modal-close",
          ".semi-modal-close",
          "[class*='modal'] [class*='close']",
          "[class*='Modal'] [class*='close']",
        ];

        const roots = [iframeDocument, document].filter(Boolean) as Document[];
        for (const root of roots) {
          for (const selector of closeSelectors) {
            const closeButton = root.querySelector(selector) as HTMLElement | null;
            if (closeButton && this.isElementVisible(closeButton)) {
              closeButton.click();
              return;
            }
          }

          const modalRoots = Array.from(
            root.querySelectorAll<HTMLElement>("[role='dialog'], [class*='modal'], [class*='Modal']"),
          );
          for (const modalRoot of modalRoots) {
            const textCloseButton =
              this.findExactTextControl(modalRoot, "取消") || this.findExactTextControl(modalRoot, "关闭");
            if (textCloseButton) {
              textCloseButton.click();
              return;
            }
          }
        }

        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
      }

      private async createImageFile(fileData: NonNullable<VideoData["cover"]>): Promise<File | null> {
        try {
          if (!fileData.url) {
            console.log("车家号封面数据缺少 URL，跳过上传");
            return null;
          }

          if (fileData.type && !fileData.type.includes("image/")) {
            console.log("车家号封面不是图片类型，跳过上传:", fileData.type);
            return null;
          }

          const response = await fetch(fileData.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();
          return new File([blob], fileData.name || `cover_${Date.now()}.png`, {
            type: fileData.type || blob.type || "image/png",
          });
        } catch (error) {
          console.warn("车家号封面文件获取失败:", error);
          return null;
        }
      }

      public async uploadCover(coverData: NonNullable<VideoData["cover"]>): Promise<boolean> {
        let coverEditorOpened = false;
        let coverIframeDocument: Document | null = null;

        try {
          console.log("🖼️ 开始上传车家号封面:", coverData);

          const editCoverButton = this.findCoverEditButton();
          console.debug("cover edit button -->", editCoverButton);
          if (!editCoverButton) {
            console.log("未找到车家号封面编辑入口，跳过封面上传");
            return false;
          }

          editCoverButton.click();
          coverEditorOpened = true;
          const iframe = (await this.waitForElementOptional(
            "iframe[name='mofangIframe']",
            5000,
          )) as HTMLIFrameElement | null;
          console.debug("cover iframe -->", iframe);
          const iframeDocument = iframe?.contentDocument || null;
          coverIframeDocument = iframeDocument;
          if (!iframeDocument) {
            console.log("未找到车家号封面编辑 iframe，跳过封面上传");
            this.closeCoverEditor();
            return false;
          }

          const fileInput = (await this.waitForElementInRootOptional(
            'input[accept="image/*"]',
            iframeDocument,
            5000,
          )) as HTMLInputElement | null;
          console.debug("cover file input -->", fileInput);
          if (!fileInput) {
            console.log("未找到车家号封面上传输入框，跳过封面上传");
            this.closeCoverEditor(iframeDocument);
            return false;
          }

          const coverFile = await this.createImageFile(coverData);
          if (!coverFile) {
            this.closeCoverEditor(iframeDocument);
            return false;
          }

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(coverFile);
          if (dataTransfer.files.length === 0) {
            this.closeCoverEditor(iframeDocument);
            return false;
          }

          fileInput.files = dataTransfer.files;
          this.dispatchInputEvents(fileInput);
          console.log("车家号封面上传操作已触发");
          await this.sleep(3000);

          const doneButton = Array.from(iframeDocument.querySelectorAll<HTMLElement>("span")).find(
            (span) => span.textContent?.trim() === "完成制作",
          );
          console.debug("cover done button -->", doneButton);
          if (!doneButton) {
            console.log("未找到车家号封面完成制作按钮，跳过确认");
            this.closeCoverEditor(iframeDocument);
            return false;
          }

          doneButton.click();
          return true;
        } catch (error) {
          console.warn("车家号封面上传失败，继续发布流程:", error);
          if (coverEditorOpened) {
            this.closeCoverEditor(coverIframeDocument);
          }
          return false;
        }
      }

      private getUploadStatusText(): string {
        return Array.from(
          document.querySelectorAll<HTMLElement>(
            "#browser_0, div[data-uploadstatus], [class*='upload'], [class*='progress'], .ant-progress",
          ),
        )
          .map((element) => element.textContent?.trim() || "")
          .filter(Boolean)
          .join("\n");
      }

      private hasUploadFailureText(text: string): boolean {
        return ["上传失败", "上传出错", "上传异常", "转码失败", "重新上传"].some((item) => text.includes(item));
      }

      private hasUploadProgressText(text: string): boolean {
        return ["上传中", "已上传", "剩余时间", "上传速度", "%"].some((item) => text.includes(item));
      }

      private hasUploadSuccessText(text: string): boolean {
        return ["上传完成", "上传成功", "视频上传完成", "视频上传成功"].some((item) => text.includes(item));
      }

      private hasUploadSuccessMarker(statusText = this.getUploadStatusText()): boolean {
        const successElement = document.querySelector(
          "div[data-uploadstatus='success'], div[data-uploadstatus='complete'], div[data-uploadstatus='done']",
        );
        return !!successElement || this.hasUploadSuccessText(statusText);
      }

      private async waitForVideoUploadComplete(
        timeout = 120000,
        uploadWasSeen = false,
        successWasPresentBeforeCurrentUpload = false,
      ): Promise<boolean> {
        const startedAt = Date.now();
        let sawUploadSignal = uploadWasSeen;
        let successWasAbsentAfterCurrentUpload = !successWasPresentBeforeCurrentUpload;
        let loggedStaleSuccessMarker = false;

        while (Date.now() - startedAt < timeout) {
          const statusText = this.getUploadStatusText();

          if (this.hasUploadFailureText(statusText)) {
            console.warn("车家号视频上传失败，跳过自动发布:", statusText.substring(0, 200));
            return false;
          }

          const hasSuccessMarker = this.hasUploadSuccessMarker(statusText);
          if (hasSuccessMarker) {
            if (successWasAbsentAfterCurrentUpload) {
              console.log("✅ 车家号视频上传已确认完成");
              return true;
            }

            if (!loggedStaleSuccessMarker) {
              console.warn("车家号检测到本次上传前已存在的完成标记，等待当前上传产生新的完成状态");
              loggedStaleSuccessMarker = true;
            }
          } else {
            successWasAbsentAfterCurrentUpload = true;
          }

          const uploadingElement = document.querySelector("div[data-uploadstatus='uploading']");
          const isUploading = !!uploadingElement || this.hasUploadProgressText(statusText);
          if (isUploading) {
            sawUploadSignal = true;
          }

          await this.sleep(3000);
        }

        console.warn(
          sawUploadSignal
            ? "车家号视频上传超时：未观察到明确上传成功标记，跳过自动发布"
            : "车家号视频上传超时：未观察到上传状态或成功标记，跳过自动发布",
        );
        return false;
      }

      private async confirmVideoUploadIfNeeded(
        waitForCompletion: boolean,
        timeout = 120000,
        uploadWasSeen = false,
        successWasPresentBeforeCurrentUpload = false,
      ): Promise<boolean> {
        if (!waitForCompletion) {
          console.log("车家号手动发布流程：视频上传已触发，不等待上传完成");
          return false;
        }

        return await this.waitForVideoUploadComplete(timeout, uploadWasSeen, successWasPresentBeforeCurrentUpload);
      }

      public async publishIfAutoEnabled(autoPublish: boolean, videoUploaded: boolean): Promise<void> {
        if (autoPublish !== true) return;

        if (!videoUploaded) {
          console.warn("车家号自动发布已跳过：视频未确认上传成功");
          return;
        }

        if (this.usedHardcodedUploadFallback) {
          console.warn("车家号自动发布已跳过：本次上传使用了硬编码 AHVP fallback 参数");
          return;
        }

        await this.sleep(5000);
        const VideoPublishButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
          (button) => {
            const visibleText = button.innerText || button.textContent || "";
            return this.isElementVisible(button) && visibleText.includes("发布");
          },
        );
        const exactPublishButton = document.querySelector(
          "div.button_publish.item.editor-btn.editor-main-btn",
        ) as HTMLElement | null;
        const publishButton = VideoPublishButton || exactPublishButton || null;
        console.debug("sendButton -->", publishButton);
        if (!publishButton) {
          console.debug("未找到车家号发布按钮");
          return;
        }

        publishButton.dispatchEvent(new Event("click", { bubbles: true }));
        console.log("✅ 车家号发布按钮点击成功");
      }

      /**
       * 创建具有完整功能的文件项对象
       */
      private createFileItem(file: File): any {
        const fileItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          state: "ready",

          // 必要的方法
          getID: function () {
            return this.id;
          },

          getState: function () {
            return this.state;
          },

          setState: function (state: string) {
            this.state = state;
            this.trigger("state", state);
            return this;
          },

          getFile: function () {
            return this.file;
          },

          getSize: function () {
            return this.size;
          },

          getName: function () {
            return this.name;
          },

          getType: function () {
            return this.type;
          },

          // 事件系统
          eventListeners: new Map(),

          on: function (event: string, callback: (...args: any[]) => void) {
            if (!this.eventListeners.has(event)) {
              this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(callback);
            return this;
          },

          off: function (event: string, callback: (...args: any[]) => void) {
            if (this.eventListeners.has(event)) {
              const listeners = this.eventListeners.get(event);
              const index = listeners.indexOf(callback);
              if (index > -1) {
                listeners.splice(index, 1);
              }
            }
            return this;
          },

          trigger: function (event: string, data: any) {
            if (this.eventListeners.has(event)) {
              this.eventListeners.get(event).forEach((callback: (...args: any[]) => void) => {
                try {
                  callback(data);
                } catch (e) {
                  console.error("文件项事件回调错误:", e);
                }
              });
            }
            return this;
          },
        };

        return fileItem;
      }

      /**
       * 上传视频文件 - 基于车家号muploader系统（使用成功的控制台代码）
       */
      public async uploadVideo(videoData: any, waitForCompletion = false): Promise<boolean> {
        try {
          console.log("📹 开始上传视频...");

          // 获取视频文件
          let file: File;
          if (videoData.videoFile) {
            file = videoData.videoFile;
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

          let currentUploadTriggered = false;
          let currentUploadSuccessWasPresentBeforeTrigger = false;
          let currentUploadBaselineCaptured = false;

          const captureCurrentUploadBaseline = () => {
            if (currentUploadBaselineCaptured) return;

            currentUploadSuccessWasPresentBeforeTrigger = this.hasUploadSuccessMarker();
            currentUploadBaselineCaptured = true;

            if (currentUploadSuccessWasPresentBeforeTrigger) {
              console.log("⚠️ 检测到旧的上传完成标记，本次上传需要等待新的完成状态");
            }
          };

          const markCurrentUploadTriggered = () => {
            currentUploadTriggered = true;
          };

          const confirmCurrentUploadIfNeeded = async (timeout = 120000, uploadWasSeen = false) => {
            if (!currentUploadTriggered) {
              console.warn("车家号忽略上传状态：当前视频文件尚未触发选择或change事件");
              return false;
            }

            return await this.confirmVideoUploadIfNeeded(
              waitForCompletion,
              timeout,
              uploadWasSeen,
              currentUploadSuccessWasPresentBeforeTrigger,
            );
          };

          // 等待页面完全加载
          console.log("⏳ 等待页面加载完成...");
          await this.sleep(5000);

          // 首先检查上传区域状态
          console.log("🔍 检查上传区域状态...");
          const browserElement = document.querySelector("#browser_0");
          if (browserElement) {
            console.log("✅ 找到browser_0元素");

            // 检查browser_0内的a标签
            const uploadLink = browserElement.querySelector("a");
            if (uploadLink) {
              console.log("✅ 找到browser_0内的a标签");
              console.log("  - a标签文本:", uploadLink.textContent?.substring(0, 50));
              console.log("  - a标签href:", uploadLink.href);
              console.log("  - a标签class:", uploadLink.className);

              const linkText = uploadLink.textContent || "";

              // 检查a标签的内容变化来判断上传状态
              if (
                linkText.includes("上传中") ||
                linkText.includes("已上传") ||
                linkText.includes("上传速度") ||
                linkText.includes("剩余时间")
              ) {
                console.log("⚠️ 检测到上传状态，但当前视频尚未触发上传，继续设置本次文件");
              }

              if (linkText.includes("上传失败") || linkText.includes("重新上传")) {
                console.log("❌ 检测到上传失败状态");
                return false;
              }

              if (this.hasUploadSuccessText(linkText)) {
                console.log("⚠️ 检测到旧的上传完成状态，继续设置本次文件");
              }
            } else {
              console.log("❌ 未找到browser_0内的a标签");
            }

            console.log("  - browser_0子元素数量:", browserElement.children.length);
            console.log("  - browser_0内容:", browserElement.textContent?.substring(0, 100));

            // 如果a标签消失或内容变化，可能上传已经开始
            if (!uploadLink || browserElement.children.length === 0) {
              console.log("⚠️ a标签消失或browser_0内容变化，检查上传状态...");

              const progressElements = document.querySelectorAll(
                '[class*="progress"], [class*="upload"], .ant-progress',
              );
              if (progressElements.length > 0) {
                console.log("⚠️ 检测到既有上传进度元素，继续设置本次文件");
              }
            }
          } else {
            console.log("❌ 未找到browser_0元素");
          }

          // 检查车家号的上传系统
          console.log("🔍 检查车家号上传系统...");
          console.log("  - window.AHVP:", typeof (window as any).AHVP);
          console.log("  - window.muploader:", typeof (window as any).muploader);
          console.log("  - window.browser_0_:", typeof (window as any).browser_0_);

          // 诊断AHVP加载状态
          console.log("🔍 诊断AHVP加载状态...");
          console.log("  - window.AHVP:", typeof (window as any).AHVP);
          console.log("  - window.muploader:", typeof (window as any).muploader);
          console.log("  - window.browser_0_:", typeof (window as any).browser_0_);

          // 检查页面是否包含AHVP脚本
          const scripts = Array.from(document.querySelectorAll("script")).map((s) => s.src);
          const ahvpScripts = scripts.filter((src) => src && (src.includes("ahvp") || src.includes("uploader")));
          console.log("🔍 AHVP相关脚本:", ahvpScripts);

          // 检查当前URL和页面状态
          console.log("🔍 当前页面信息:");
          console.log("  - URL:", window.location.href);
          console.log("  - 标题:", document.title);

          // 查找上传相关元素
          const uploadElements = document.querySelectorAll('#browser_0, [class*="upload"], [id*="upload"]');
          console.log("🔍 上传相关元素数量:", uploadElements.length);

          // 先主动尝试触发上传，然后再等待AHVP
          console.log("🔄 先尝试主动触发上传...");

          const browserElementForUpload = document.querySelector("#browser_0") as HTMLElement | null;
          if (browserElementForUpload) {
            console.log("✅ 找到browser_0，尝试直接文件操作");

            // 创建文件输入框附加到browser_0
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "video/*,.mp4,.avi,.mov,.wmv";
            fileInput.style.position = "absolute";
            fileInput.style.opacity = "0";
            fileInput.style.width = "100%";
            fileInput.style.height = "100%";
            fileInput.style.top = "0";
            fileInput.style.left = "0";
            fileInput.style.zIndex = "9999";
            fileInput.id = `multipost_direct_${Date.now()}`;

            browserElementForUpload.style.position = "relative";
            browserElementForUpload.appendChild(fileInput);

            console.log("✅ 文件输入框已附加到browser_0");

            // 设置文件并触发选择
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            captureCurrentUploadBaseline();
            fileInput.files = dataTransfer.files;

            // 尝试直接触发拖放事件来设置文件
            console.log("🔧 尝试通过拖放事件设置文件...");

            // 创建拖放事件
            const dragEnterEvent = new DragEvent("dragenter", {
              bubbles: true,
              cancelable: true,
              dataTransfer: new DataTransfer(),
            });

            const dropEvent = new DragEvent("drop", {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer,
            });

            // 在browser_0上触发拖放事件
            browserElementForUpload.dispatchEvent(dragEnterEvent);
            await this.sleep(100);
            browserElementForUpload.dispatchEvent(dropEvent);
            markCurrentUploadTriggered();

            console.log("✅ 拖放事件已触发");

            // 等待一下让DOM更新
            await this.sleep(2000);

            // 检查browser_0是否有变化
            const uploadLink = browserElementForUpload.querySelector("a");
            if (uploadLink) {
              const linkText = uploadLink.textContent || "";
              console.log("📋 点击后的a标签文本:", linkText.substring(0, 100));

              if (
                linkText.includes("上传中") ||
                linkText.includes("0.00%") ||
                linkText.includes("已上传") ||
                linkText.includes("上传速度")
              ) {
                console.log("✅ 触发成功！检测到实际上传状态");
                return await confirmCurrentUploadIfNeeded(120000, true);
              }

              if (this.hasUploadSuccessText(linkText)) {
                console.log("🎉 检测到上传完成状态，等待确认是否属于本次上传");
                return await confirmCurrentUploadIfNeeded(120000, false);
              }
            }

            // 尝试直接在已存在的文件输入框中设置文件
            console.log("🔧 尝试找到现有的文件输入框并设置文件...");

            const existingFileInputs = browserElementForUpload.querySelectorAll(
              'input[type="file"]',
            ) as NodeListOf<HTMLInputElement>;
            let fileSetSuccess = false;

            existingFileInputs.forEach((existingInput, index) => {
              console.log(`📋 找到现有文件输入框 ${index + 1}:`, existingInput.accept);

              if (existingInput.accept?.includes("video")) {
                const existingDataTransfer = new DataTransfer();
                existingDataTransfer.items.add(file);
                captureCurrentUploadBaseline();
                existingInput.files = existingDataTransfer.files;

                // 触发多种事件
                existingInput.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
                existingInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                markCurrentUploadTriggered();

                console.log("✅ 已在现有文件输入框中设置文件");
                fileSetSuccess = true;
              }
            });

            if (!fileSetSuccess) {
              // 尝试点击browser_0的a标签来模拟用户操作
              const uploadLinkForClick = browserElementForUpload.querySelector("a");
              if (uploadLinkForClick) {
                console.log("🖱️ 尝试模拟用户点击browser_0的a标签...");

                // 先移除我们添加的文件输入框
                fileInput.remove();

                // 模拟用户点击a标签
                uploadLinkForClick.click();

                // 等待用户操作完成后再次添加文件
                await this.sleep(1000);

                // 重新创建文件输入框
                const newFileInput = document.createElement("input");
                newFileInput.type = "file";
                newFileInput.accept = "video/*,.mp4,.avi,.mov,.wmv";
                newFileInput.style.position = "absolute";
                newFileInput.style.opacity = "0";
                newFileInput.style.width = "100%";
                newFileInput.style.height = "100%";
                newFileInput.style.top = "0";
                newFileInput.style.left = "0";
                newFileInput.style.zIndex = "9999";
                newFileInput.id = `multipost_after_click_${Date.now()}`;

                browserElementForUpload.appendChild(newFileInput);

                // 设置文件
                const newDataTransfer = new DataTransfer();
                newDataTransfer.items.add(file);
                captureCurrentUploadBaseline();
                newFileInput.files = newDataTransfer.files;

                // 触发事件
                console.log("🔄 在用户激活后触发文件change事件...");
                newFileInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                markCurrentUploadTriggered();

                // 清理
                newFileInput.remove();
              } else {
                // 如果没有a标签，直接尝试触发change事件
                console.log("🔄 触发文件change事件...");
                fileInput.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                markCurrentUploadTriggered();
              }
            }

            await this.sleep(2000);

            // 再次检查状态
            const finalLink = browserElementForUpload.querySelector("a");
            if (finalLink) {
              const finalText = finalLink.textContent || "";
              console.log("📋 最终的a标签文本:", finalText.substring(0, 100));

              if (
                finalText.includes("上传中") ||
                finalText.includes("0.00%") ||
                finalText.includes("已上传") ||
                finalText.includes("上传速度")
              ) {
                console.log("✅ 文件上传触发成功！检测到实际上传状态");
                return await confirmCurrentUploadIfNeeded(120000, true);
              }

              if (this.hasUploadSuccessText(finalText)) {
                console.log("🎉 检测到上传完成状态，等待确认是否属于本次上传");
                return await confirmCurrentUploadIfNeeded(120000, false);
              }
            }

            console.log("❌ 主动文件操作未能触发上传");

            // 清理文件输入框
            if (fileInput.parentNode) {
              fileInput.remove();
            }
          }

          // 如果直接操作失败，再尝试AHVP系统
          console.log("⏳ 直接操作无效，尝试等待AHVP系统...");

          // 等待AHVP系统加载（基于我们的成功测试经验）
          console.log("🔄 等待AHVP系统加载...");
          let AHVP = (window as any).AHVP;
          let attempts = 0;

          while (!AHVP && attempts < 30) {
            await this.sleep(1000);
            AHVP = (window as any).AHVP;
            attempts++;

            if (attempts % 5 === 0) {
              console.log(`  - 尝试 ${attempts}/30: ${typeof AHVP}`);

              // 每5秒尝试触发上传区域
              const uploadArea = document.querySelector('#browser_0, [class*="upload"]') as HTMLElement | null;
              if (uploadArea && attempts === 5) {
                console.log("🖱️ 尝试点击上传区域触发AHVP加载...");
                uploadArea.click();
                await this.sleep(1000);
              }
            }
          }

          if (!AHVP) {
            console.error("❌ AHVP系统未加载，但检测到AHVP脚本已存在");
            console.error("💡 CSP策略禁止了eval()，无法强制重新初始化");
            console.log("🔄 转为检测现有上传状态...");

            // 既然无法使用AHVP，检查是否已经有其他上传机制在工作
            // 详细检查页面状态
            console.log("🔍 详细检查页面状态...");

            // 1. 精确检查browser_0内的a标签
            const browserElement = document.querySelector("#browser_0");
            if (browserElement) {
              console.log("✅ 找到browser_0元素");

              const uploadLink = browserElement.querySelector("a");
              if (uploadLink) {
                console.log("✅ 找到browser_0内的a标签");
                const linkText = uploadLink.textContent || "";
                console.log("  - a标签文本:", linkText.substring(0, 100));

                // 直接从a标签文本判断上传状态
                if (
                  linkText.includes("上传中") ||
                  linkText.includes("已上传") ||
                  linkText.includes("上传速度") ||
                  linkText.includes("剩余时间") ||
                  linkText.includes("0.00%")
                ) {
                  console.log("✅ a标签显示上传状态，上传正在进行中");
                  return await confirmCurrentUploadIfNeeded(120000, true);
                }

                if (linkText.includes("上传失败") || linkText.includes("重新上传")) {
                  console.log("❌ a标签显示上传失败");
                  return false;
                }

                if (this.hasUploadSuccessText(linkText)) {
                  console.log("🎉 a标签显示上传完成，等待确认是否属于本次上传");
                  return await confirmCurrentUploadIfNeeded(120000, false);
                }
              } else {
                console.log("❌ 未找到browser_0内的a标签");

                // 如果a标签不存在，可能已经被上传状态替换了
                const browserText = browserElement.textContent || "";
                if (browserText.includes("上传中") || browserText.includes("已上传")) {
                  console.log("✅ browser_0显示上传状态（a标签可能已被替换）");
                  return await confirmCurrentUploadIfNeeded(120000, true);
                }
              }
            } else {
              console.log("❌ 未找到browser_0元素");
            }

            // 3. 检查是否有文件已被添加到其他上传系统
            const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
            let filesFound = false;
            fileInputs.forEach((input, index) => {
              if (input.files && input.files.length > 0) {
                console.log(`✅ 文件输入框${index}已有文件:`, input.files[0].name);
                filesFound = true;
              }
            });

            if (filesFound) {
              console.log("✅ 检测到文件已设置到输入框，上传可能已开始");
              return await confirmCurrentUploadIfNeeded(30000, false);
            }

            // 4. 检查是否有XHR上传活动
            const originalXHR = window.XMLHttpRequest;
            let uploadActive = false;

            (window as any).XMLHttpRequest = () => {
              const xhr = new originalXHR();
              const originalOpen = xhr.open;
              xhr.open = function (method: string, url: string | URL, ...args: any[]) {
                if (url?.toString().includes("upload")) {
                  console.log("✅ 检测到上传XHR:", method, url);
                  uploadActive = true;
                }
                return originalOpen.apply(this, [method, url, ...args] as any);
              };
              return xhr;
            };

            // 等待几秒看是否有上传活动
            await this.sleep(3000);

            // 恢复原始XHR
            window.XMLHttpRequest = originalXHR;

            if (uploadActive) {
              console.log("✅ 检测到上传活动");
              return await confirmCurrentUploadIfNeeded(120000, true);
            }

            // 5. 检查页面文本内容中的上传状态
            console.log("🔄 检查页面文本中的上传状态...");
            const bodyText = document.body.textContent || "";
            const uploadStatusIndicators = [
              "上传中",
              "已上传",
              "上传速度",
              "剩余时间",
              "上传进度",
              "上传失败",
              "重新上传",
            ];

            let uploadDetected = false;
            for (const indicator of uploadStatusIndicators) {
              if (bodyText.includes(indicator)) {
                console.log(`✅ 在页面文本中找到上传状态指示: "${indicator}"`);
                uploadDetected = true;
              }
            }

            if (uploadDetected) {
              console.log("✅ 检测到页面显示上传状态，上传正在进行中");

              // 进一步检查具体的上传状态
              if (bodyText.includes("上传中")) {
                console.log("📊 状态: 上传进行中");
                return await confirmCurrentUploadIfNeeded(120000, true);
              }
              if (bodyText.includes("上传失败") || bodyText.includes("重新上传")) {
                console.log("❌ 状态: 上传失败");
                return false;
              }
              if (this.hasUploadSuccessText(bodyText)) {
                console.log("🎉 状态: 上传完成，等待确认是否属于本次上传");
                return await confirmCurrentUploadIfNeeded(120000, false);
              }

              return await confirmCurrentUploadIfNeeded(120000, true);
            }

            // 6. 最后检查：查找上传/发布按钮
            console.log("🔄 检查上传/发布按钮...");
            const uploadButtons = document.querySelectorAll('button, [class*="upload"], [class*="submit"], div, span');
            for (const button of uploadButtons) {
              const text = button.textContent?.trim() || "";
              if (text.includes("上传") || text.includes("发布") || text.includes("提交")) {
                console.log("✅ 找到上传/发布按钮:", text);

                // 分析按钮文本判断状态
                if (text.includes("上传失败") || text.includes("重新上传")) {
                  console.log("❌ 检测到上传失败状态");
                  return false;
                }
                if (text.includes("上传中") || text.includes("已上传")) {
                  console.log("✅ 检测到上传进行中状态");
                  return await confirmCurrentUploadIfNeeded(120000, true);
                }
                if (this.hasUploadSuccessText(text)) {
                  console.log("🎉 检测到上传完成状态，等待确认是否属于本次上传");
                  return await confirmCurrentUploadIfNeeded(120000, false);
                }
              }
            }

            console.log("❌ 无法检测到明确的上传活动");
            console.log("🔧 建议: AHVP系统可能需要手动触发或页面刷新后重试");
            return false;
          }

          console.log("✅ AHVP系统已加载");

          // 验证AHVP功能
          console.log("🔍 验证AHVP功能...");
          console.log("  - AHVP.newUploaderManager:", typeof AHVP.newUploaderManager);
          console.log("  - AHVP.UPLOADER_EVENT:", !!AHVP.UPLOADER_EVENT);

          this.usedHardcodedUploadFallback = true;
          console.warn(
            "⚠️ 车家号视频上传进入硬编码 AHVP fallback 路径；本次流程将禁止自动发布，避免使用默认参数直接发布",
          );

          // 创建上传manager（按照成功的控制台代码模式）
          console.log("🔧 创建上传manager...");
          const manager = new AHVP.newUploaderManager(2);
          (window as any).muploader = manager;
          console.log("✅ 创建manager成功");

          // 使用成功的配置参数
          const config = {
            isvr: 0,
            target: "browser_0",
            dragtarget: "browser_0",
            userid: "0A33363922E51BDE",
            _timestamp: Math.floor(Date.now() / 1000),
            _appid: "chejiahao_extension",
            _sign: "extension_sign",
            h5: true,
            waitstart: 1,
            param: "lt=30&gt=3",
            iw: 0,
            provider: "autohome",
            callback: "http://creator-content-api.corpautohome.com/public/video/transcoding",
            update: (callback: (config: any) => void, config: any) => {
              // 更新认证参数
              const newConfig = {
                ...config,
                _timestamp: Math.floor(Date.now() / 1000),
                callback: "http://creator-content-api.corpautohome.com/public/video/transcoding",
              };
              callback(newConfig);
            },
          };

          // 创建browser
          console.log("🔧 创建browser...");
          const browser = manager.createBrowser(config);
          if (!browser) {
            console.error("❌ 创建browser失败");
            return false;
          }

          console.log("✅ 创建browser成功");

          // 添加视频过滤器
          browser.addFileFilter("video");
          console.log("✅ 添加视频过滤器成功");

          // 创建完整的文件项对象
          const fileItem = this.createFileItem(file);
          console.log("✅ 创建文件项对象:", fileItem);

          // 设置事件监听
          browser.on(AHVP.UPLOADER_EVENT.ITEMSELECTED, (item: any) => {
            console.log("🎯 文件被选择:", item);
          });

          browser.on(AHVP.UPLOADER_EVENT.PROGRESS, (_item: any, progress: number) => {
            console.log("📊 上传进度:", `${Math.round(progress * 100)}%`);
          });

          browser.on(AHVP.UPLOADER_EVENT.SUCCESS, (_item: any, response: any) => {
            console.log("✅ 上传成功:", response);
          });

          browser.on(AHVP.UPLOADER_EVENT.ERROR, (_item: any, error: any) => {
            console.error("❌ 上传失败:", error);
          });

          // 添加文件到manager
          console.log("📁 添加文件到manager...");
          manager.addItem(fileItem);
          console.log("✅ 文件添加到manager");

          // 开始上传
          console.log("🚀 开始上传...");
          manager.start();
          markCurrentUploadTriggered();

          if (!waitForCompletion) {
            console.log("车家号手动发布流程：AHVP fallback 上传已启动，不等待上传完成");
            return false;
          }

          // Wait for explicit AHVP completion only in auto-publish mode.
          return new Promise<boolean>((resolve) => {
            let uploadCompleted = false;

            const finish = (succeeded: boolean) => {
              if (uploadCompleted) return;
              uploadCompleted = true;
              resolve(succeeded);
            };

            // 监听上传完成事件
            browser.on(AHVP.UPLOADER_EVENT.COMPLETED, (_item: any, response: any) => {
              console.log("🎉 上传完成:", response);
              finish(true);
            });

            browser.on(AHVP.UPLOADER_EVENT.ERROR, (_item: any, error: any) => {
              console.error("❌ 上传失败:", error);
              finish(false);
            });

            // 超时处理
            setTimeout(() => {
              if (!uploadCompleted) {
                console.warn("⏰ 车家号视频上传超时，未视为成功，跳过自动发布");
                finish(false);
              }
            }, 120000); // 2分钟超时
          });
        } catch (error) {
          console.error("❌ 视频上传失败:", error);
          console.error("错误详情:", error.stack);
          return false;
        }
      }
    };

    console.log("✅ 上传器类定义完成");

    const uploader = new ChejiahaoVideoUploaderInline();
    console.log("✅ 上传器实例创建完成");

    // 步骤1: 填写标题
    if (title) {
      console.log("📝 填写标题:", title);
      await uploader.fillTitle(title);
    }

    // 步骤2: 自动勾选原创和首发
    console.log("✅ 自动勾选原创和首发...");
    await uploader.checkOriginalAndFirst();

    // 步骤3: 填写描述
    if (content) {
      console.log("📝 填写描述:", `${content.substring(0, 100)}...`);
      await uploader.fillDescription(description ?? content);
    }

    let videoUploaded = false;

    // Step 4: upload the required video.
    if (video) {
      console.log("🎥 开始上传视频...");
      videoUploaded = await uploader.uploadVideo(video, data.isAutoPublish === true);
    } else {
      console.error("❌ 缺少视频文件");
      return;
    }

    // Step 5: upload cover best-effort. Cover failure must not block publish.
    if (cover) {
      await uploader.uploadCover(cover).catch((error) => {
        console.warn("车家号封面上传异常，继续发布流程:", error);
        return false;
      });
    }

    // Step 6: auto-publish only after the video upload is confirmed.
    await uploader.publishIfAutoEnabled(data.isAutoPublish, videoUploaded);

    console.log("🎉 车家号视频发布流程完成");
    return;
  } catch (error) {
    console.error("💥 车家号视频发布失败:", error);
    console.error("错误详情:", error.stack);
    return;
  }
}
