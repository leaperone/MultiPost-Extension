import { type SyncData, type VideoData } from '../common';

export async function VideoDewu(data: SyncData) {
  console.log('🎬 VideoDewu函数被调用');
  console.log('📥 接收到的data参数:', data);

  // 防止重复执行
  if ((window as unknown as { __dewuRunning?: boolean }).__dewuRunning) {
    console.log('⚠️ Dewu脚本已在运行中，跳过重复执行');
    return;
  }
  (window as unknown as { __dewuRunning?: boolean }).__dewuRunning = true;

  console.log('🚀 开始执行Dewu视频发布脚本');

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function getVideoMetadata(): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    // 基于用户反馈，直接使用 1280x720 作为默认尺寸
    return {
      duration: 0,
      width: 1280,
      height: 720
    };
  }

  
  async function uploadVideo(file: File): Promise<void> {
    console.log('🎬 开始视频上传流程');

    await sleep(3000);

    // 确保在"发布视频"标签页
    const videoTab = document.querySelector('#rc-tabs-0-tab-1') as HTMLElement;
    if (videoTab && !videoTab.classList.contains('pd-tabs-tab-active')) {
      console.log('🖱️ 点击发布视频标签页');
      videoTab.click();
      await sleep(2000);
    }

    const fileInputs = document.querySelectorAll('input[type="file"]');
    console.log(`🔍 找到 ${fileInputs.length} 个文件输入框`);

    if (fileInputs.length === 0) {
      throw new Error('页面上没有找到任何文件输入框');
    }

    const videoInput = fileInputs[0] as HTMLInputElement;
    console.log('✅ 使用第一个文件输入框');

    console.log('📁 准备上传视频文件:', file.name, file.type, file.size);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    videoInput.files = dataTransfer.files;

    const changeEvent = new Event('change', { bubbles: true });
    videoInput.dispatchEvent(changeEvent);

    console.log('✅ 视频文件设置完成，开始上传...');

    // 立即返回，不等待上传完成
    return;
  }

  async function waitForUploadCompletion(timeout = 30000): Promise<void> {
    console.log('⏳ 等待视频上传完成...');
    await sleep(timeout);
    console.log('✅ 视频上传等待完成，继续执行');
  }

  async function fillTitle(title: string): Promise<void> {
    console.log('🔍 开始填写标题:', title);

    // 等待页面完全加载
    await sleep(3000);

    // 直接使用 id="title" 填充
    const titleInput = document.getElementById('title') as HTMLInputElement;

    if (titleInput) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 标题已填写:', title);
      return;
    }

    console.log('⚠️ 未找到标题输入框');
  }

  async function fillDescription(content: string): Promise<void> {
    console.log('🔍 开始填写描述:', content);

    // 等待页面完全加载
    await sleep(5000);

    // 创建临时元素来处理HTML标签
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    console.log('🔍 查找描述输入框，目标内容:', plainText);

    // 使用简单的选择器找到描述输入框
    const descriptionSelectors = [
      'div[contenteditable="true"][data-placeholder="填写完整的描述信息"]',
      'div[contenteditable="true"]',
      '[data-placeholder*="描述"]',
      '[data-placeholder*="内容"]',
      '[data-placeholder*="动态"]',
      'textarea'
    ];

    for (const selector of descriptionSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const el = element as HTMLElement | HTMLTextAreaElement;
        if (el.offsetParent !== null) {
          console.log(`✅ 找到描述输入框: ${selector}`);

          // 根据元素类型选择填写方式
          if (el.contentEditable === 'true') {
            // contenteditable div
            (el as HTMLElement).innerText = plainText;
          } else if (el.tagName === 'TEXTAREA') {
            // textarea
            (el as HTMLTextAreaElement).value = plainText;
          } else {
            // 其他输入框
            (el as HTMLInputElement).value = plainText;
          }

          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));

          console.log('✅ 描述已填写:', plainText.substring(0, 100) + '...');
          return;
        }
      }
    }

    console.log('⚠️ 未找到描述输入框');
  }

  async function uploadCover(cover: { url: string; name: string; type?: string }, videoAspectRatio: number): Promise<void> {
    console.log('🖼️ 开始上传封面:', cover);

    try {
      await sleep(5000);

      // 步骤1: 点击"编辑封面"按钮
      console.log('🔍 查找编辑封面按钮...');

      // 通过文本内容查找按钮，避免使用动态CSS类
      const buttons = document.querySelectorAll('button');
      let editCoverButton: HTMLElement | null = null;

      for (const button of buttons) {
        const text = button.textContent?.trim();
        if (text && text.includes('编辑封面')) {
          editCoverButton = button as HTMLElement;
          console.log('✅ 通过文本找到编辑封面按钮');
          break;
        }
      }

      if (!editCoverButton) {
        console.log('❌ 未找到编辑封面按钮，尝试查找包含"封面"的按钮...');
        for (const button of buttons) {
          const text = button.textContent?.trim();
          if (text && text.includes('封面')) {
            editCoverButton = button as HTMLElement;
            console.log('✅ 通过部分文本找到编辑封面按钮');
            break;
          }
        }
      }

      if (!editCoverButton) {
        console.log('❌ 未找到编辑封面按钮');
        return;
      }

      console.log('✅ 点击编辑封面按钮');
      editCoverButton.click();
      await sleep(3000);

      // 步骤2: 点击"上传封面"标签页
      console.log('🔍 查找上传封面标签页...');
      const uploadCoverTabSelectors = [
        '#rc-tabs-1-tab-2', // 具体的ID
        'div[role="tab"]:contains("上传封面")', // 通过文本查找
        '.pd-tabs-tab:contains("上传封面")' // 通过类和文本查找
      ];

      let uploadCoverTab: HTMLElement | null = null;
      for (const selector of uploadCoverTabSelectors) {
        if (selector.includes(':contains')) {
          const tabs = document.querySelectorAll('[role="tab"]');
          for (const tab of tabs) {
            if (tab.textContent?.includes('上传封面')) {
              uploadCoverTab = tab as HTMLElement;
              console.log(`✅ 通过文本找到上传封面标签页`);
              break;
            }
          }
        } else {
          uploadCoverTab = document.querySelector(selector) as HTMLElement;
        }

        if (uploadCoverTab) {
          console.log(`✅ 找到上传封面标签页: ${selector}`);
          break;
        }
      }

      if (uploadCoverTab) {
        console.log('✅ 点击上传封面标签页');
        uploadCoverTab.click();
        await sleep(2000);
      }

      // 步骤3: 查找上传区域并触发文件上传
      console.log('🔍 查找上传区域...');

      // 查找包含上传文本的元素
      const uploadTextElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.trim();
        return text && text.includes('将文件拖拽到这里') && text.includes('支持jpg');
      });

      let uploadArea: HTMLElement | null = null;

      if (uploadTextElements.length > 0) {
        // 找到包含上传文本的元素，然后向上查找其父级容器
        uploadArea = uploadTextElements[0].closest('div') as HTMLElement;
        console.log('✅ 通过文本找到上传区域');
      } else {
        // 备用方案：查找包含上传图标的区域
        const uploadImages = Array.from(document.querySelectorAll('img')).filter(img => {
          const src = img.src.toLowerCase();
          return src.includes('upload') || src.includes('add') || src.includes('plus');
        });

        if (uploadImages.length > 0) {
          uploadArea = uploadImages[0].closest('div') as HTMLElement;
          console.log('✅ 通过图标找到上传区域');
        }
      }

      if (!uploadArea) {
        console.log('❌ 未找到上传区域，尝试所有可能的div容器...');
        // 最后的备用方案：查找模态框内的大div
        const modalDivs = Array.from(document.querySelectorAll('.modal *, .dialog *, [role="dialog"] *'));
        for (const div of modalDivs) {
          if (div.tagName === 'DIV' && div.children.length > 0) {
            uploadArea = div as HTMLElement;
            console.log('✅ 使用模态框内的div作为上传区域');
            break;
          }
        }
      }

      if (!uploadArea) {
        console.log('❌ 未找到上传区域');
        return;
      }

      // 步骤4: 准备封面文件
      console.log('📁 准备封面文件...');
      const response = await fetch(cover.url);
      const arrayBuffer = await response.arrayBuffer();
      const coverFile = new File([arrayBuffer], cover.name, {
        type: cover.type || 'image/jpeg'
      });

      console.log('📁 封面文件信息:', coverFile.name, coverFile.size, coverFile.type);

      // 方法1: 查找现有的文件输入框
      console.log('🔍 查找现有的文件输入框...');
      const fileInputs = uploadArea.querySelectorAll('input[type="file"]');
      let targetFileInput: HTMLInputElement | null = null;

      if (fileInputs.length > 0) {
        targetFileInput = fileInputs[0] as HTMLInputElement;
        console.log('✅ 找到现有文件输入框');
      } else {
        // 方法2: 创建文件输入框
        console.log('📝 创建新的文件输入框...');
        targetFileInput = document.createElement('input');
        targetFileInput.type = 'file';
        targetFileInput.accept = 'image/*,.jpg,.jpeg,.png,.webp';
        targetFileInput.style.display = 'none';
        targetFileInput.id = `dewu_cover_upload_${Date.now()}`;
        document.body.appendChild(targetFileInput);
      }

      // 设置文件
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(coverFile);
      targetFileInput.files = dataTransfer.files;

      // 触发文件选择事件
      console.log('📤 触发文件选择事件...');
      targetFileInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      await sleep(1000);

      // 方法3: 直接点击上传区域触发文件选择
      console.log('🖱️ 尝试直接点击上传区域...');
      uploadArea.click();
      await sleep(1000);

      // 清理临时创建的文件输入框
      if (targetFileInput.id.startsWith('dewu_cover_upload_')) {
        targetFileInput.remove();
      }

      console.log('✅ 封面文件设置完成');

      // 步骤5: 等待上传完成并选择封面比例
      console.log('⏳ 等待封面上传完成...');
      await sleep(5000);

      // 根据视频比例选择合适的封面裁剪比例
      console.log('🎯 根据视频比例选择封面裁剪比例:', videoAspectRatio.toFixed(2));
      await selectCoverAspectRatio(videoAspectRatio);

      // 步骤6: 查找并点击确定按钮
      console.log('🔍 查找模态框确定按钮...');
      const confirmButtonSelectors = [
        'button:contains("确定")', // 通过文本查找
        '.pd-modal-footer .pd-btn-primary', // 模态框 footer 中的主要按钮
        '.ant-modal-footer .ant-btn-primary', // Ant Design 模态框
        '[class*="modal"] [class*="confirm"]', // 包含确认类名的按钮
        '.pd-btn-primary:contains("确定")' // 主要按钮且包含确定文本
      ];

      let confirmButton: HTMLElement | null = null;
      for (const selector of confirmButtonSelectors) {
        if (selector.includes(':contains')) {
          const buttons = document.querySelectorAll('button');
          for (const button of buttons) {
            if (button.textContent?.includes('确定') && button.textContent?.length <= 10) {
              // 确保按钮文本相对简短，避免匹配到其他包含"确定"的长文本
              confirmButton = button as HTMLElement;
              console.log(`✅ 通过文本找到确定按钮`);
              break;
            }
          }
        } else {
          confirmButton = document.querySelector(selector) as HTMLElement;
        }

        if (confirmButton && confirmButton.offsetParent !== null) {
          console.log(`✅ 找到确定按钮: ${selector}`);
          break;
        }
      }

      if (confirmButton) {
        console.log('✅ 点击确定按钮完成封面上传');
        confirmButton.click();
        await sleep(3000);
        console.log('🎉 封面上传完成');
      } else {
        console.log('⚠️ 未找到确定按钮，可能需要手动确认');
      }

    } catch (error) {
      console.error('❌ 封面上传失败:', error);
    }
  }

  async function selectCoverAspectRatio(videoAspectRatio: number): Promise<void> {
    console.log('🎯 开始选择封面裁剪比例，视频比例:', videoAspectRatio.toFixed(2));

    try {
      // 根据视频比例确定推荐的封面裁剪比例
      let recommendedRatio = '';
      if (videoAspectRatio >= 1.5) { // 横版视频 (3:2 或更宽)
        recommendedRatio = '4:3'; // 横版视频优先选择 4:3
      } else if (videoAspectRatio >= 0.8) { // 接近正方形的视频
        recommendedRatio = '1:1';
      } else { // 竖版视频
        recommendedRatio = '3:4'; // 竖版视频选择 3:4
      }

      console.log('📏 推荐封面裁剪比例:', recommendedRatio);

      // 查找封面裁剪比例选择选项
      console.log('🔍 查找封面裁剪比例选择选项...');

      // 首先查找"裁剪比例"标题所在的区域
      const cutRatioTitleElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.trim();
        return text && text.includes('裁剪比例');
      });

      let selectedOption: HTMLElement | null = null;

      if (cutRatioTitleElements.length > 0) {
        console.log('✅ 找到"裁剪比例"区域');

        // 在裁剪比例区域内查找比例选项
        const cutRatioContainer = cutRatioTitleElements[0].parentElement || cutRatioTitleElements[0].closest('div');
        if (cutRatioContainer) {
          // 查找所有包含比例文本的元素
          const ratioElements = Array.from(cutRatioContainer.querySelectorAll('*')).filter(el => {
            const text = el.textContent?.trim();
            const ratios = ['16:9', '4:3', '1:1', '9:16', '3:4'];
            return text && ratios.some(ratio => text === ratio || text.includes(ratio));
          });

          console.log(`🔍 在裁剪比例区域找到 ${ratioElements.length} 个比例选项`);

          // 对于横版视频，优先选择4:3比例
          if (recommendedRatio === '4:3') {
            // 先尝试查找4:3比例
            for (const element of ratioElements) {
              if (element.textContent?.trim() === '4:3') {
                selectedOption = element as HTMLElement;
                console.log('✅ 找到4:3比例选项');
                break;
              }
            }

            // 如果没找到4:3，尝试16:9（也是横版比例）
            if (!selectedOption) {
              for (const element of ratioElements) {
                if (element.textContent?.trim() === '16:9') {
                  selectedOption = element as HTMLElement;
                  console.log('✅ 找到16:9比例选项');
                  break;
                }
              }
            }
          } else {
            // 对于其他视频比例，先尝试查找推荐的比例
            for (const element of ratioElements) {
              if (element.textContent?.trim() === recommendedRatio ||
                  element.textContent?.trim().includes(recommendedRatio)) {
                selectedOption = element as HTMLElement;
                console.log(`✅ 找到推荐比例选项: ${recommendedRatio}`);
                break;
              }
            }
          }

          // 如果没找到推荐比例，选择第一个可用的选项
          if (!selectedOption && ratioElements.length > 0) {
            console.log(`⚠️ 未找到推荐比例 ${recommendedRatio}，选择第一个可用选项`);
            selectedOption = ratioElements[0] as HTMLElement;
            console.log(`✅ 选择了比例选项: ${selectedOption.textContent?.trim()}`);
          }
        }
      } else {
        console.log('⚠️ 未找到"裁剪比例"区域，尝试全局搜索比例选项');
        // 备用方案：全局搜索比例选项
        const allElements = document.querySelectorAll('*');

        // 对于横版视频，优先搜索4:3和16:9
        if (recommendedRatio === '4:3') {
          for (const element of allElements) {
            const text = element.textContent?.trim();
            if (text === '4:3') {
              selectedOption = element as HTMLElement;
              console.log('✅ 通过全局搜索找到4:3比例选项');
              break;
            }
          }

          if (!selectedOption) {
            for (const element of allElements) {
              const text = element.textContent?.trim();
              if (text === '16:9') {
                selectedOption = element as HTMLElement;
                console.log('✅ 通过全局搜索找到16:9比例选项');
                break;
              }
            }
          }
        }

        // 如果还没找到，按推荐比例搜索
        if (!selectedOption) {
          for (const element of allElements) {
            const text = element.textContent?.trim();
            const ratios = ['16:9', '4:3', '1:1', '9:16', '3:4'];
            if (text && ratios.some(ratio => text === ratio)) {
              if (text === recommendedRatio || text.includes(recommendedRatio)) {
                selectedOption = element as HTMLElement;
                console.log(`✅ 通过全局搜索找到推荐比例选项: ${recommendedRatio}`);
                break;
              }
            }
          }
        }

        // 最后，选择第一个找到的比例选项
        if (!selectedOption) {
          for (const element of allElements) {
            const text = element.textContent?.trim();
            const ratios = ['16:9', '4:3', '1:1', '9:16', '3:4'];
            if (text && ratios.some(ratio => text === ratio)) {
              selectedOption = element as HTMLElement;
              console.log(`✅ 选择第一个找到的比例选项: ${text}`);
              break;
            }
          }
        }
      }

      // 点击选择的选项
      if (selectedOption) {
        console.log('✅ 点击封面裁剪比例选项');
        if (selectedOption.tagName === 'INPUT') {
          (selectedOption as HTMLInputElement).checked = true;
          selectedOption.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          selectedOption.click();
        }
        await sleep(1000);
        console.log('✅ 封面裁剪比例选择完成');
      } else {
        console.log('⚠️ 未找到封面裁剪比例选择选项，跳过此步骤');
      }

    } catch (error) {
      console.error('❌ 封面裁剪比例选择失败:', error);
    }
  }

  // 主执行逻辑
  try {
    console.log('🔍 开始数据结构检查');
    console.log('📝 data参数:', data);

    if (!data || !data.data) {
      console.error('❌ 数据参数为空');
      return;
    }

    const { content, video, title, tags, cover } = data.data as VideoData;

    if (!video) {
      console.error('❌ 缺少视频文件');
      return;
    }

    // 获取视频元数据
    const metadata = await getVideoMetadata();
    const aspectRatio = metadata.width / metadata.height;
    console.log('📊 视频信息:', {
      width: metadata.width,
      height: metadata.height,
      aspectRatio: aspectRatio.toFixed(2)
    });

    // 下载视频文件
    console.log('📥 开始下载视频文件...');
    const response = await fetch(video.url);
    const arrayBuffer = await response.arrayBuffer();
    const videoFile = new File([arrayBuffer], video.name, {
      type: video.type
    });

    console.log('✅ 视频文件准备完成');

    // 将标签合并到描述中
    let finalContent = content || '';
    if (tags && tags.length > 0) {
      const tagString = tags.map(tag => `#${tag}`).join(' ');
      finalContent = `${finalContent} ${tagString}`.trim();
      console.log('📝 合并后的内容:', finalContent);
    }

    // 先启动视频上传
    console.log('📤 开始上传视频...');
    const uploadPromise = uploadVideo(videoFile).then(async () => {
      console.log('📤 视频文件已设置，等待上传完成...');
      await waitForUploadCompletion();
      console.log('✅ 视频上传完成');
    });

    // 等待一下确保视频上传已经开始
    await sleep(1000);

    // 然后开始填写表单
    console.log('📝 开始填写表单...');
    await fillDescription(finalContent);
    await fillTitle(title || '');
    console.log('✅ 表单填写完成');

    // 等待视频上传完成
    console.log('⏳ 等待视频上传完成...');
    await uploadPromise;

    // 上传自定义封面
    if (cover) {
      console.log('🖼️ 开始上传自定义封面...');
      await uploadCover(cover, aspectRatio);
    }

    // 自动发布
    if (data.isAutoPublish) {
      await sleep(5000);
      const publishButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (publishButton) {
        console.log('🚀 点击发布按钮');
        publishButton.click();
      } else {
        console.log('⚠️ 未找到发布按钮');
      }
    }

    console.log('✅ Dewu视频发布完成');

  } catch (error) {
    console.error('❌ Dewu视频发布过程中出错:', error);
    throw error;
  } finally {
    // 清理状态
    console.log('🧹 清理执行状态');
    (window as unknown as { __dewuRunning?: boolean }).__dewuRunning = false;
  }
}