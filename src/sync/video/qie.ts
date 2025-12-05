import type { SyncData } from "../common";

// 主导出函数
export async function VideoQiE(data: SyncData) {
  console.log("🎬 QiE视频上传开始...");
  console.log("📊 接收到的数据:", {
    hasVideo: !!(data.data as any)?.video,
    hasCover: !!(data.data as any)?.cover,
    hasTitle: !!(data.data as any)?.title,
    hasContent: !!(data.data as any)?.content,
    tagsCount: (data.data as any)?.tags?.length || 0,
    isAutoPublish: data.isAutoPublish,
  });

  try {
    console.log("开始创建QiEVideoUploader实例...");
    // 直接在这里定义类，避免作用域问题
    class QiEVideoUploader {
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
          observer.observe(document.body, { childList: true, subtree: true });
          setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element "${selector}" not found`));
          }, timeout);
        });
      }

      private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      private simulateClick(element: HTMLElement): void {
        const rect = element.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;

        element.dispatchEvent(
          new MouseEvent("mousedown", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: clickX,
            clientY: clickY,
          }),
        );

        element.dispatchEvent(
          new MouseEvent("mouseup", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: clickX,
            clientY: clickY,
          }),
        );

        element.dispatchEvent(
          new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: clickX,
            clientY: clickY,
          }),
        );
      }

      async process(data: SyncData): Promise<void> {
        console.log("🚀 开始QiE处理流程...");
        console.log("🌐 当前页面URL:", window.location.href);

        if (!window.location.href.includes("om.qq.com")) {
          console.log("⚠️ 当前页面不是企鹅号页面，跳过处理");
          return;
        }

        const videoData = data.data as any;
        const { video, title, content, tags, cover } = videoData;

        if (video) {
          console.log("开始上传视频文件:", video.name);

          // 执行视频上传
          const uploadSuccess = await this.performVideoUpload(video, videoData);
          if (!uploadSuccess) {
            console.log("❌ 视频上传失败，终止流程");
            return;
          }

          console.log("✅ 视频上传完成，开始处理内容编辑...");

          // 等待页面完全加载
          await this.sleep(3000);

          // 处理标题输入
          if (title) {
            await this.fillTitle(title);
          }

          await this.sleep(2000);

          // 处理简介输入
          if (content) {
            await this.fillContent(content);
          }

          await this.sleep(2000);

          // 处理标签
          if (tags && tags.length > 0) {
            await this.fillTags(tags);
          }

          // 上传封面
          if (cover) {
            await this.sleep(1000);
            await this.uploadCover(cover.url);
          }

          // 等待所有操作完成
          await this.sleep(3000);

          // 自动发布（如果需要）
          if (data.isAutoPublish) {
            await this.attemptAutoPublish();
          }
        }
      }

      private async performVideoUpload(video: any, videoData: any): Promise<boolean> {
        try {
          const fileInput = await this.findVideoFileInput();
          if (!fileInput) {
            console.log("❌ 未找到视频上传输入框");
            return false;
          }

          console.log("📁 开始上传视频文件...");
          const response = await fetch(video.url);
          const blob = await response.arrayBuffer();
          const extension = video.name.split(".").pop() || "mp4";
          const videoFilename = `${videoData.title || "video"}.${extension}`;
          const videoFile = new File([blob], videoFilename, { type: video.type });

          console.log("📹 视频文件信息:", {
            name: videoFile.name,
            type: videoFile.type,
            size: videoFile.size,
          });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(videoFile);
          fileInput.files = dataTransfer.files;

          // 触发多个事件确保上传
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));

          console.log("✅ 视频上传事件已触发");

          // 等待视频上传完成并页面跳转
          await this.waitForVideoUpload();
          return true;
        } catch (error) {
          console.error("❌ 视频上传过程出错:", error);
          return false;
        }
      }

      private async findVideoFileInput(): Promise<HTMLInputElement | null> {
        const fileSelectors = [
          'input[type="file"]', // 通用文件输入框选择器
          'input[name="Filedata"]', // 企鹅号特定的文件输入框
          "#upload-input", // 如果有ID的话
          ".upload-input", // 如果有固定类名的话
        ];

        console.log("🔍 开始查找视频上传输入框...");

        // 首次尝试
        for (const selector of fileSelectors) {
          const fileInput = document.querySelector(selector) as HTMLInputElement;
          if (fileInput) {
            console.log(`✅ 找到视频上传输入框，使用选择器: ${selector}`);
            return fileInput;
          }
          console.log(`❌ 选择器 ${selector} 未找到元素`);
        }

        // 延迟重试
        console.log("⏳ 等待3秒后再次尝试查找文件输入框...");
        await this.sleep(3000);

        for (const selector of fileSelectors) {
          const fileInput = document.querySelector(selector) as HTMLInputElement;
          if (fileInput) {
            console.log(`✅ 延迟查找成功，使用选择器: ${selector}`);
            return fileInput;
          }
        }

        console.log("❌ 延迟查找后仍未找到文件输入框");
        return null;
      }

      private async fillTitle(title: string): Promise<void> {
        console.log("开始处理标题输入...");
        const titleSelectors = [
          ".omui-inputautogrowing.omui-articletitle__input.omui-articletitle__input1",
          ".omui-inputautogrowing.omui-articletitle__input.omui-articletitle__input2",
          ".omui-articletitle__input",
          "div.omui-inputautogrowing",
        ];

        let titleInput: HTMLElement | null = null;
        for (const selector of titleSelectors) {
          titleInput = document.querySelector(selector) as HTMLElement;
          if (titleInput) {
            console.log("找到标题输入框:", selector);
            break;
          }
        }

        if (titleInput) {
          titleInput.click();
          await this.sleep(500);

          if (titleInput.contentEditable === "true") {
            titleInput.textContent = title;
            titleInput.dispatchEvent(new Event("input", { bubbles: true }));
          } else {
            const input = titleInput as HTMLInputElement;
            input.value = title;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          console.log("✅ 企鹅号标题已输入:", title);
        } else {
          console.log("❌ 未找到任何标题输入框");
        }
      }

      private async fillContent(content: string): Promise<void> {
        console.log("开始处理简介输入...");
        const textarea = document.querySelector("textarea.omui-textarea__inner") as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = content || "";
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("✅ 企鹅号简介已输入:", `${content.substring(0, 50)}...`);
        } else {
          console.log("❌ 未找到简介输入框");
        }
      }

      private async fillTags(tags: string[]): Promise<void> {
        console.log("开始添加企鹅号标签...");

        // 查找标签输入框 - 在-tag容器内
        const tagContainerEl = document.getElementById("-tag");
        let tagInput: HTMLInputElement | null = null;

        if (tagContainerEl) {
          console.log("✅ 找到-tag容器，在其中查找标签输入框");
          tagInput = tagContainerEl.querySelector(".omui-suggestion__value") as HTMLInputElement;

          if (!tagInput) {
            tagInput = tagContainerEl.querySelector("input.omui-suggestion__value") as HTMLInputElement;
          }

          if (!tagInput) {
            tagInput = tagContainerEl.querySelector(".omui-suggestion__input input") as HTMLInputElement;
          }

          if (!tagInput) {
            tagInput = tagContainerEl.querySelector('input[style*="width: 2px"]') as HTMLInputElement;
          }
        } else {
          console.log("⚠️ 未找到-tag容器，尝试全局查找");
          tagInput = document.querySelector(".omui-suggestion__value") as HTMLInputElement;
        }
        if (tagInput) {
          // 先点击整个标签区域确保激活
          const tagContainer = document.querySelector(".omui-suggestion__input");
          if (tagContainer) {
            (tagContainer as HTMLElement).click();
            await this.sleep(300);
          }

          for (const tag of tags.slice(0, 9)) {
            console.log(`添加标签: ${tag}`);
            tagInput.focus();
            await this.sleep(200);
            // 根据placeholder提示，使用空格键添加标签
            console.log("🔧 使用空格键添加标签:", tag);

            // 方法1: 先输入标签，然后按空格键
            tagInput.value = tag;
            tagInput.dispatchEvent(new Event("input", { bubbles: true }));
            await this.sleep(200);

            // 按空格键添加标签（根据placeholder提示）
            const spaceEvent = new KeyboardEvent("keydown", {
              bubbles: true,
              cancelable: true,
              key: " ",
              code: "Space",
              keyCode: 32,
              which: 32,
            });
            tagInput.dispatchEvent(spaceEvent);

            const spaceKeyUpEvent = new KeyboardEvent("keyup", {
              bubbles: true,
              cancelable: true,
              key: " ",
              code: "Space",
              keyCode: 32,
              which: 32,
            });
            tagInput.dispatchEvent(spaceKeyUpEvent);

            await this.sleep(300);

            // 方法2: 如果空格键不行，尝试Enter键
            const enterEvent = new KeyboardEvent("keydown", {
              bubbles: true,
              cancelable: true,
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
            });
            tagInput.dispatchEvent(enterEvent);

            await this.sleep(200);

            // 方法3: 点击建议选项
            const suggestionOptions = document.querySelectorAll(".omui-suggestion__option") as NodeListOf<HTMLElement>;
            for (const option of suggestionOptions) {
              if (option.textContent?.trim() === tag && !option.classList.contains("disabled")) {
                console.log("✅ 找到匹配的标签建议选项，点击添加");
                option.click();
                await this.sleep(500);
                break;
              }
            }

            // 方法4: 检查是否有已创建的标签
            const addedTags = document.querySelectorAll(
              '.omui-tag, .omui-suggestion__tag, [class*="tag"], .omui-suggestion__value-wrap .tag',
            );
            console.log(`📋 当前已添加的标签数量: ${addedTags.length}`);

            // 如果还是没有添加，尝试直接在value中添加空格
            if (addedTags.length === 0) {
              console.log("🔄 尝试直接在输入值中添加空格");
              tagInput.value = `${tag} `;
              tagInput.dispatchEvent(new Event("input", { bubbles: true }));
              await this.sleep(200);
            }

            tagInput.value = "";
            tagInput.dispatchEvent(new Event("input", { bubbles: true }));
            await this.sleep(100);
          }
          console.log("✅ 企鹅号标签已添加");
        } else {
          console.log("❌ 未找到标签输入框");
        }
      }

      private async attemptAutoPublish(): Promise<void> {
        const publishButton = document.querySelector(
          'button[class*="publish"], button[class*="submit"]',
        ) as HTMLElement;
        if (publishButton) {
          console.log("点击企鹅号发布按钮");
          publishButton.click();
        } else {
          console.log("❌ 未找到发布按钮");
        }
      }

      private async waitForVideoUpload(timeout = 300000): Promise<void> {
        return new Promise((resolve, reject) => {
          let currentUrl = window.location.href;
          let uploadCompleted = false;

          const checkInterval = setInterval(() => {
            if (window.location.href !== currentUrl) {
              console.log("🔄 检测到页面跳转，从", currentUrl, "跳转到", window.location.href);
              currentUrl = window.location.href;
            }

            // 检查是否有标题输入框出现（表示进入编辑页面）
            const titleInput = document.querySelector(".omui-inputautogrowing.omui-articletitle__input");
            if (titleInput && !uploadCompleted) {
              uploadCompleted = true;
              clearInterval(checkInterval);
              console.log("✅ 企鹅号视频上传完成，已进入编辑页面");
              setTimeout(() => {
                resolve();
              }, 3000);
            }
          }, 2000);

          setTimeout(() => {
            clearInterval(checkInterval);
            if (!uploadCompleted) {
              reject(new Error("企鹅号视频上传超时"));
            }
          }, timeout);
        });
      }

      private async clickCoverUploadButton(): Promise<boolean> {
        try {
          console.log("🔍 查找封面上传按钮...");

          // 首先查找 id 为 -poster 的元素
          const posterContainer = document.querySelector("#-poster") as HTMLElement;
          if (!posterContainer) {
            console.log("❌ 未找到 # -poster 容器");
            return false;
          }

          console.log("✅ 找到 # -poster 容器");

          // 在该容器内查找 omui-button omui-button--add 按钮
          const uploadButton = posterContainer.querySelector(".omui-button.omui-button--add") as HTMLElement;
          if (!uploadButton) {
            console.log("❌ 在 # -poster 容器内未找到上传按钮");
            // 打印容器内的元素用于调试
            const buttons = posterContainer.querySelectorAll("button");
            console.log(`📋 容器内找到 ${buttons.length} 个按钮:`);
            buttons.forEach((button, index) => {
              console.log(`按钮 ${index + 1}:`, {
                className: button.className,
                textContent: button.textContent?.trim(),
                id: button.id,
              });
            });
            return false;
          }

          console.log("✅ 找到封面上传按钮，准备点击...");

          // 点击按钮
          this.simulateClick(uploadButton);
          await this.sleep(500);

          console.log("✅ 封面上传按钮点击完成");
          return true;
        } catch (error) {
          console.error("❌ 点击封面上传按钮时出错:", error);
          return false;
        }
      }

      private async uploadCover(coverUrl: string): Promise<boolean> {
        console.log("🖼️ 开始上传封面图片...");

        try {
          // 首先点击封面上传按钮触发弹框
          const uploadButtonClicked = await this.clickCoverUploadButton();
          if (!uploadButtonClicked) {
            console.log("⚠️ 无法点击封面上传按钮，尝试其他方式");
            return true;
          }

          // 等待弹框出现
          console.log("⏳ 等待封面上传弹框出现...");
          await this.sleep(1500);

          // 切换到本地上传模式并上传
          return await this.switchToLocalUpload(coverUrl);
        } catch (error) {
          console.error("❌ 封面上传过程出错:", error);
          return true; // 出错也不阻断流程
        }
      }

      private async switchToLocalUpload(coverUrl: string): Promise<boolean> {
        console.log("🔄 处理封面上传弹框，切换到本地上传模式...");

        // 等待弹框完全出现
        await this.sleep(1000);

        // 查找弹框中的选项卡
        let localUploadTab: HTMLElement | null = null;

        // 查找所有弹框中的选项卡
        const dialogTabs = document.querySelectorAll(
          ".omui-dialog .omui-tab__label, .omui-dialog-wrapper .omui-tab__label",
        ) as NodeListOf<HTMLElement>;
        console.log(`📋 在弹框中找到 ${dialogTabs.length} 个选项卡`);

        // 打印所有找到的选项卡信息用于调试
        dialogTabs.forEach((tab, index) => {
          console.log(`弹框选项卡 ${index + 1}: "${tab.textContent?.trim()}"`, {
            isActive: tab.classList.contains("is--active"),
            className: tab.className,
          });
        });

        // 更精确地查找封面选择弹框中的本地上传选项卡
        console.log("🔍 查找封面选择弹框中的本地上传选项卡...");

        // 方式1：查找包含"封面截取"和"本地上传"的选项卡组
        const allTabNavs = document.querySelectorAll(".omui-tab__nav") as NodeListOf<HTMLElement>;
        let _foundCorrectGroup = false;

        console.log(`📋 找到 ${allTabNavs.length} 个选项卡导航组`);

        for (let i = 0; i < allTabNavs.length; i++) {
          const nav = allTabNavs[i];
          const labels = nav.querySelectorAll(".omui-tab__label") as NodeListOf<HTMLElement>;

          console.log(`检查第 ${i + 1} 个选项卡组，包含 ${labels.length} 个选项卡:`);

          // 打印这个组的所有选项卡
          labels.forEach((tab, index) => {
            console.log(`  - 选项卡 ${index + 1}: "${tab.textContent?.trim()}"`);
          });

          // 检查是否包含4个选项卡且有"封面截取"和"本地上传"
          if (labels.length === 4) {
            const firstTab = labels[0].textContent?.trim();
            const secondTab = labels[1].textContent?.trim();

            if (firstTab === "封面截取" && secondTab === "本地上传") {
              localUploadTab = labels[1]; // 第二个选项卡
              _foundCorrectGroup = true;
              console.log("✅ 找到正确的封面选择选项卡组，本地上传是第2个选项卡");
              break;
            }
          }
        }

        // 如果方式1没找到，使用方式2：在打开的弹框中查找
        if (!localUploadTab) {
          console.log("⚠️ 方式1未找到，尝试在打开的弹框中查找...");
          const openDialogTabs = document.querySelectorAll(
            ".omui-dialog-wrapper.open .omui-tab__nav .omui-tab__label",
          ) as NodeListOf<HTMLElement>;
          console.log(`📋 在打开的弹框中找到 ${openDialogTabs.length} 个选项卡`);

          openDialogTabs.forEach((tab, index) => {
            console.log(`弹框选项卡 ${index + 1}: "${tab.textContent?.trim()}"`);
          });

          // 查找第二个选项卡（本地上传）
          if (openDialogTabs.length >= 2) {
            const secondTab = openDialogTabs[1];
            if (secondTab.textContent?.includes("本地上传")) {
              localUploadTab = secondTab;
              console.log("✅ 在打开弹框中找到本地上传选项卡（第2个）");
            }
          }

          // 如果还是没找到，遍历所有选项卡查找
          if (!localUploadTab) {
            for (let i = 0; i < openDialogTabs.length; i++) {
              const tab = openDialogTabs[i];
              if (tab.textContent?.includes("本地上传")) {
                localUploadTab = tab;
                console.log(`✅ 遍历找到本地上传选项卡（第${i + 1}个）`);
                break;
              }
            }
          }
        }

        if (!localUploadTab) {
          console.log("❌ 未找到本地上传选项卡");
          return true;
        }

        // 点击本地上传选项卡
        console.log("🎯 点击本地上传选项卡...");
        this.simulateClick(localUploadTab);
        await this.sleep(1000);

        // 获取同一个选项卡组中的所有选项卡，用于设置激活状态
        const parentNav = localUploadTab.closest(".omui-tab__nav") as HTMLElement;
        if (parentNav) {
          const siblingTabs = parentNav.querySelectorAll(".omui-tab__label") as NodeListOf<HTMLElement>;

          // 强制设置为激活状态，同时移除其他选项卡的激活状态
          siblingTabs.forEach((tab, _index) => {
            if (tab === localUploadTab) {
              tab.classList.add("is--active", "is--selected");
              console.log(`✅ 激活选项卡: "${tab.textContent?.trim()}"`);
            } else {
              tab.classList.remove("is--active", "is--selected");
            }
          });
        } else {
          // 备用方案：直接设置单个选项卡的激活状态
          localUploadTab.classList.add("is--active", "is--selected");
          console.log(`✅ 激活选项卡: "${localUploadTab.textContent?.trim()}"`);
        }

        await this.sleep(500);

        if (localUploadTab.classList.contains("is--active")) {
          console.log("✅ 成功切换到本地上传选项卡");
        } else {
          console.log("⚠️ 选项卡状态可能未正确更新，但继续执行");
        }

        // 等待本地上传面板加载完成
        console.log("⏳ 等待本地上传面板加载...");
        await this.sleep(1500);

        // 查找文件输入框 - 专门查找图片输入框，排除视频输入框
        console.log("🔍 开始专门查找图片上传输入框...");

        // 首先收集所有可能的文件输入框
        const allFileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
        console.log(`📋 页面总共有 ${allFileInputs.length} 个文件输入框`);

        let fileInput: HTMLInputElement | null = null;
        let selectorUsed = "";

        // 详细检查每个文件输入框
        for (let i = 0; i < allFileInputs.length; i++) {
          const input = allFileInputs[i];
          const accept = input.accept?.toLowerCase() || "";

          console.log(`🔍 检查输入框 ${i + 1}:`, {
            accept: input.accept,
            type: input.type,
            hidden: input.hasAttribute("hidden"),
            style: input.style.display,
            offsetParent: !!input.offsetParent,
            className: input.className,
            name: input.name,
          });

          // 严格排除视频输入框
          if (accept.includes("video")) {
            console.log(`❌ 跳过视频输入框 ${i + 1}: accept="${input.accept}"`);
            continue;
          }

          // 优先选择明确接受图片的输入框
          if (accept.includes("image")) {
            fileInput = input;
            selectorUsed = `图片专用输入框 #${i + 1}`;
            console.log(`✅ 找到图片专用输入框 ${i + 1}: accept="${input.accept}"`);
            break;
          }

          // 其次选择没有accept限制的输入框（可能支持多种格式）
          if (!accept && !fileInput) {
            fileInput = input;
            selectorUsed = `通用输入框 #${i + 1}`;
            console.log(`📌 备用选择通用输入框 ${i + 1}: 无accept限制`);
          }
        }

        // 如果还没找到，在弹框中再次精确查找
        if (!fileInput) {
          console.log("⚠️ 在所有输入框中未找到合适的，尝试在弹框中精确查找...");
          const dialogInputs = document.querySelectorAll(
            '.omui-dialog input[type="file"], .omui-dialog-wrapper input[type="file"]',
          ) as NodeListOf<HTMLInputElement>;

          for (let i = 0; i < dialogInputs.length; i++) {
            const input = dialogInputs[i];
            const accept = input.accept?.toLowerCase() || "";

            // 严格排除视频输入框
            if (accept.includes("video")) {
              console.log(`❌ 跳过弹框中的视频输入框 ${i + 1}: accept="${input.accept}"`);
              continue;
            }

            // 优先选择图片输入框
            if (accept.includes("image")) {
              fileInput = input;
              selectorUsed = `弹框图片输入框 #${i + 1}`;
              console.log(`✅ 找到弹框图片输入框 ${i + 1}: accept="${input.accept}"`);
              break;
            }

            // 备用选择无限制的弹框输入框
            if (!accept && !fileInput) {
              fileInput = input;
              selectorUsed = `弹框通用输入框 #${i + 1}`;
              console.log(`📌 备用选择弹框通用输入框 ${i + 1}`);
            }
          }
        }

        // 不管输入框是否隐藏，只要有就使用
        if (!fileInput) {
          console.log("❌ 完全未找到合适的图片输入框，无法上传封面");
          return true;
        }

        // 显示找到的输入框信息
        console.log(`🎯 最终使用的文件输入框: ${selectorUsed}`, {
          accept: fileInput.accept,
          type: fileInput.type,
          hidden: fileInput.hasAttribute("hidden"),
          style: fileInput.style.display,
          offsetParent: !!fileInput.offsetParent,
          className: fileInput.className,
          name: fileInput.name,
        });

        // 如果找到的输入框没有明确接受图片，添加图片支持
        if (!fileInput.accept || (!fileInput.accept.includes("image") && !fileInput.accept.includes("video"))) {
          console.log("🔧 设置输入框accept属性支持图片...");
          fileInput.setAttribute("accept", "image/*");
        }

        // 先点击上传按钮以确保文件输入框被激活
        console.log("🖱️ 点击上传按钮以确保文件输入框激活...");
        // 通过"上传图片"文本找到对应的标题，然后找到同级的按钮
        const uploadTitle = Array.from(document.querySelectorAll("h4")).find((h4) =>
          h4.textContent?.includes("上传图片"),
        );
        const uploadButton = uploadTitle?.parentElement?.querySelector("button") as HTMLElement;
        if (uploadButton) {
          this.simulateClick(uploadButton);
          await this.sleep(500);
        } else {
          console.log("⚠️ 未找到上传按钮，直接尝试文件上传");
        }

        // 获取图片数据并上传
        console.log("🖼️ 获取封面图片数据...");
        return await this.performCoverUpload(fileInput, coverUrl);
      }

      private async performCoverUpload(fileInput: HTMLInputElement, coverUrl: string): Promise<boolean> {
        try {
          const response = await fetch(coverUrl);
          const blob = await response.blob();
          const fileName = `cover_${Date.now()}.${blob.type.split("/")[1] || "jpg"}`;
          const coverFile = new File([blob], fileName, { type: blob.type });

          console.log("📄 封面文件信息:", {
            name: coverFile.name,
            type: coverFile.type,
            size: coverFile.size,
          });

          // 验证文件类型是否为图片
          if (!coverFile.type.startsWith("image/")) {
            console.log("⚠️ 文件类型不是图片:", coverFile.type);
          }

          // 创建DataTransfer并添加文件
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(coverFile);
          fileInput.files = dataTransfer.files;

          // 触发多个事件确保上传
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          fileInput.dispatchEvent(new Event("change", { bubbles: true })); // 再次触发

          console.log("✅ 封面上传事件已触发");
          await this.sleep(3000);

          // 检查是否有下一步按钮需要点击
          console.log("🔍 查找下一步按钮...");

          let nextButton: HTMLElement | null = null;

          // 方式1：在封面上传容器内查找"下一步"按钮
          if (fileInput) {
            const uploadContainer = fileInput.closest(".omui-tab__panel-inner");
            if (uploadContainer) {
              const buttons = uploadContainer.querySelectorAll("button") as NodeListOf<HTMLElement>;
              for (const button of buttons) {
                if (button.textContent?.trim() === "下一步") {
                  nextButton = button;
                  console.log('✅ 在上传容器内找到"下一步"按钮');
                  break;
                }
              }
            }
          }

          // 方式2：如果容器内没找到，查找带有omui-button--primary类的"下一步"按钮
          if (!nextButton) {
            const buttons = document.querySelectorAll("button.omui-button--primary") as NodeListOf<HTMLElement>;
            for (const button of buttons) {
              if (button.textContent?.trim() === "下一步") {
                nextButton = button;
                console.log('✅ 找到primary样式的"下一步"按钮');
                break;
              }
            }
          }

          // 方式3：最后fallback，查找任何"下一步"按钮
          if (!nextButton) {
            const buttons = document.querySelectorAll("button") as NodeListOf<HTMLElement>;
            for (const button of buttons) {
              if (button.textContent?.trim() === "下一步") {
                nextButton = button;
                console.log('✅ 找到任意"下一步"按钮');
                break;
              }
            }
          }

          if (nextButton) {
            console.log("➡️ 点击下一步/完成按钮...");
            this.simulateClick(nextButton);

            // 等待更长时间让页面完全加载
            await this.sleep(3000);

            // 检查是否还有其他需要处理的步骤
            console.log("🔍 检查是否还有后续步骤...");
            const hasMoreSteps = await this.checkAndHandleNextSteps();

            if (!hasMoreSteps) {
              console.log("✅ 没有发现更多需要处理的步骤");
            }
          }

          console.log("✅ 封面上传完成");
          return true;
        } catch (error) {
          console.error("❌ 执行封面上传时出错:", error);
          return true;
        }
      }

      /**
       * 处理预览选项 - 依次点击预览选项中的 radio
       */
      private async handlePreviewOptions(): Promise<boolean> {
        try {
          console.log("🔍 查找预览选项...");

          // 等待页面完全加载
          await this.sleep(1000);

          // 首先在主DOM中查找
          const previewOptions = Array.from(
            document.querySelectorAll('.preview__option-item input[type="radio"]'),
          ) as HTMLInputElement[];

          // 如果主DOM中没找到，搜索Shadow DOM
          if (previewOptions.length === 0) {
            console.log("🌐 主DOM中未找到预览选项，开始搜索Shadow DOM...");

            // 查找所有可能包含Shadow DOM的元素
            const shadowHosts = Array.from(document.querySelectorAll("*")).filter((el) => el.shadowRoot);

            shadowHosts.forEach((host, index) => {
              const shadowOptions = host.shadowRoot.querySelectorAll(
                '.preview__option-item input[type="radio"]',
              ) as NodeListOf<HTMLInputElement>;
              if (shadowOptions.length > 0) {
                console.log(`📱 Shadow DOM ${index} 中找到 ${shadowOptions.length} 个预览选项`);
                previewOptions.push(...Array.from(shadowOptions));
              }
            });
          }

          if (previewOptions.length === 0) {
            console.log("⚠️ 未找到预览选项中的 radio 元素");
            return false;
          }

          console.log(`📋 找到 ${previewOptions.length} 个预览选项 radio`);

          // 依次点击每个 radio
          for (let i = 0; i < previewOptions.length; i++) {
            const radio = previewOptions[i];
            console.log(`🎯 处理第 ${i + 1} 个预览选项 radio，当前状态: ${radio.checked ? "已选中" : "未选中"}`);

            // 如果未选中，则点击
            if (!radio.checked) {
              radio.click();
              await this.sleep(300);
              console.log(`✅ 已点击第 ${i + 1} 个选项，新状态: ${radio.checked ? "已选中" : "未选中"}`);
            }
          }

          console.log("✅ 所有预览选项处理完成");

          // 点击"完成"按钮
          console.log('🔍 查找并点击"完成"按钮...');
          let completeButtonClicked = false;

          // 1. 首先在主DOM中查找
          const buttons = document.querySelectorAll("button") as NodeListOf<HTMLElement>;
          for (const button of buttons) {
            if (button.textContent?.trim() === "完成") {
              console.log('✅ 在主DOM中找到"完成"按钮，点击...');
              this.simulateClick(button);
              await this.sleep(1000);
              console.log("✅ 已点击完成按钮");
              completeButtonClicked = true;
              break;
            }
          }

          // 2. 如果主DOM中没找到，搜索Shadow DOM
          if (!completeButtonClicked) {
            console.log('🌐 主DOM中未找到"完成"按钮，搜索Shadow DOM...');
            const shadowHosts = Array.from(document.querySelectorAll("*")).filter((el) => el.shadowRoot);

            for (const host of shadowHosts) {
              const shadowButtons = host.shadowRoot.querySelectorAll("button") as NodeListOf<HTMLElement>;
              for (const button of shadowButtons) {
                if (button.textContent?.trim() === "完成") {
                  console.log('✅ 在Shadow DOM中找到"完成"按钮，点击...');
                  this.simulateClick(button);
                  await this.sleep(1000);
                  console.log("✅ 已点击Shadow DOM中的完成按钮");
                  completeButtonClicked = true;
                  break;
                }
              }
              if (completeButtonClicked) break;
            }
          }

          if (!completeButtonClicked) {
            console.log('⚠️ 未找到"完成"按钮');
          }

          return true;
        } catch (error) {
          console.error("❌ 处理预览选项时出错:", error);
          return false;
        }
      }

      /**
       * 检查并处理后续步骤（预览选项、最终确认等）
       */
      private async checkAndHandleNextSteps(): Promise<boolean> {
        try {
          // 0. 首先处理指定复选框
          console.log("🔍 查找并勾选指定复选框...");
          const userOriginalContainer = document.getElementById("-user_original");
          if (userOriginalContainer) {
            const targetCheckbox = userOriginalContainer.querySelector(
              'input[type="checkbox"].omui-checkbox__input[value="1"]',
            ) as HTMLInputElement;
            if (targetCheckbox && !targetCheckbox.checked) {
              console.log("✅ 在-user_original容器中找到目标复选框，执行勾选...");
              targetCheckbox.click();
              await this.sleep(300);
              console.log("✅ 已勾选指定复选框");
            } else if (targetCheckbox?.checked) {
              console.log("✅ 目标复选框已勾选");
            } else {
              console.log("⚠️ 在-user_original容器中未找到目标复选框");
            }
          } else {
            console.log("⚠️ 未找到-user_original容器");
          }

          // 1. 首先尝试处理预览选项
          const previewHandled = await this.handlePreviewOptions();
          if (previewHandled) {
            return true;
          }

          // 2. 查找是否有"完成"或"确认"按钮需要点击
          const confirmButtons = [
            { text: "完成", selector: "button" },
            { text: "确认", selector: "button" },
            { text: "保存", selector: "button" },
            { text: "提交", selector: "button" },
          ];

          for (const buttonConfig of confirmButtons) {
            const buttons = document.querySelectorAll(buttonConfig.selector) as NodeListOf<HTMLElement>;
            for (const button of buttons) {
              if (button.textContent?.trim() === buttonConfig.text && button.offsetParent !== null) {
                // 确保按钮是可见的
                console.log(`✅ 找到 "${buttonConfig.text}" 按钮，准备点击...`);
                this.simulateClick(button);
                await this.sleep(1000);
                return true;
              }
            }
          }

          // 3. 检查是否有其他可能的交互元素
          const interactiveElements = document.querySelectorAll(
            'input[type="radio"], input[type="checkbox"], .omui-suggestion__option',
          ) as NodeListOf<HTMLElement>;
          let foundInteractions = false;

          for (const element of interactiveElements) {
            // 对于建议选项，只点击未禁用的
            if (element.classList.contains("omui-suggestion__option") && element.classList.contains("disabled")) {
              continue;
            }

            if (element.offsetParent !== null) {
              // 确保元素是可见的
              console.log(`🎯 找到可交互元素: ${element.tagName}.${element.className}`);
              element.click();
              await this.sleep(300);
              foundInteractions = true;
            }
          }

          if (foundInteractions) {
            return true;
          }

          // 4. 最后检查页面状态
          console.log("🔍 检查页面当前状态...");
          const pageTitle = document.title;
          const url = window.location.href;
          console.log(`当前页面: ${pageTitle} - ${url}`);

          return foundInteractions;
        } catch (error) {
          console.error("❌ 检查后续步骤时出错:", error);
          return false;
        }
      }
    }

    const uploader = new QiEVideoUploader();
    console.log("✅ QiEVideoUploader实例创建成功");
    const result = await uploader.process(data);
    console.log("🎉 QiE视频上传处理完成");
    return result;
  } catch (error) {
    console.error("❌ QiE视频上传过程中出现错误:", error);
    throw error;
  }
}
