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

    // 使用正确的选择器找到标题输入框
    const titleInput = document.querySelector('input#title.pd-input[placeholder*="填写标题"]') as HTMLInputElement;

    if (titleInput && titleInput.offsetParent !== null) {
      console.log('✅ 找到标题输入框');
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
    await sleep(3000);

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
      await sleep(3000);

      const editCoverButton = document.querySelector('.cover-edit-btn') as HTMLElement;
      if (editCoverButton) {
        editCoverButton.click();
        console.log('✅ 点击编辑封面按钮');
        await sleep(3000);
      }

      // 根据视频比例自动选择裁剪比例
      if (videoAspectRatio >= 1.6) {
        console.log('🎯 横屏视频，选择 4:3 裁剪比例');
        // 这里可以添加选择4:3比例的逻辑
      }

      const fileInput = document.querySelector('input[name="media"]') as HTMLInputElement;
      if (!fileInput) {
        console.log('⚠️ 未找到封面上传输入框');
        return;
      }

      const response = await fetch(cover.url);
      const arrayBuffer = await response.arrayBuffer();
      const coverFile = new File([arrayBuffer], cover.name, {
        type: cover.type || 'image/jpeg'
      });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(coverFile);
      fileInput.files = dataTransfer.files;

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('✅ 封面文件已设置');
      await sleep(5000);

    } catch (error) {
      console.error('❌ 封面上传失败:', error);
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
    await fillTitle(title || '');
    await fillDescription(finalContent);
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