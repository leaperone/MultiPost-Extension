import type { WebContentsView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  VideoData,
  ArticleData
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Bilibili platform adapter
 * Based on MultiPost-Extension implementation
 * Supports: DYNAMIC, VIDEO, ARTICLE
 */
export class BilibiliAdapter extends BasePlatformAdapter {
  readonly platform = 'bilibili' as const
  readonly name = 'B站'
  readonly publishUrl = 'https://t.bilibili.com'
  readonly supportedContentTypes: SyncContentType[] = ['DYNAMIC', 'VIDEO', 'ARTICLE']

  /**
   * Get JavaScript code to fill content into Bilibili publish form
   */
  getFillScript(contentType: SyncContentType, data: SyncContentData): string {
    switch (contentType) {
      case 'DYNAMIC':
        return this.getDynamicFillScript(data as DynamicData)
      case 'VIDEO':
        return this.getVideoFillScript(data as VideoData)
      case 'ARTICLE':
        return this.getArticleFillScript(data as ArticleData)
      default:
        return `console.log('Unsupported content type: ${contentType}')`
    }
  }

  /**
   * Dynamic content fill script
   */
  private getDynamicFillScript(data: DynamicData): string {
    const content = data.content || ''
    const title = data.title || ''
    const images = data.images || []

    return `
      (async function() {
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) { resolve(element); return; }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) { resolve(element); observer.disconnect(); }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found: ' + selector));
            }, timeout);
          });
        }

        async function checkImageUploadCompletion(expectedNewCount, initialCount, maxAttempts = 30, interval = 1000) {
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const currentSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;
            const newlyUploadedCount = currentSuccessCount - initialCount;

            if (newlyUploadedCount === expectedNewCount) {
              console.log('所有 ' + expectedNewCount + ' 张新图片已成功上传');
              return;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
          }

          const finalSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;
          const actualNewlyUploadedCount = finalSuccessCount - initialCount;
          console.warn('图片上传检查超时：预期新增 ' + expectedNewCount + ' 张，实际新增 ' + actualNewlyUploadedCount + ' 张');
        }

        async function cleanUploadedImages() {
          console.log('开始清理已上传的图片');
          for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const removeButton = document.querySelector('div.bili-pics-uploader__item__remove');
            if (!removeButton) {
              console.log('没有找到更多图片，已清理 ' + i + ' 张图片');
              break;
            }
            removeButton.click();
            console.log('已清理第 ' + (i + 1) + ' 张图片');
          }
          console.log('图片清理完成');
        }

        async function uploadImages(images) {
          const fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                           document.querySelector('div.bili-pics-uploader input[type="file"]');
          if (!fileInput) {
            console.error('未找到图片上传元素');
            return;
          }

          const dataTransfer = new DataTransfer();

          for (const file of images) {
            try {
              const response = await fetch(file.url);
              if (!response.ok) throw new Error('HTTP error: ' + response.status);
              const blob = await response.blob();
              const imageFile = new File([blob], file.name, { type: file.type });
              console.log('文件: ' + imageFile.name + ' ' + imageFile.type + ' ' + imageFile.size);
              dataTransfer.items.add(imageFile);
            } catch (error) {
              console.error('上传文件失败:', file.url, error);
            }
          }

          if (dataTransfer.files.length > 0) {
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('图片上传操作已触发');
          }
        }

        try {
          const images = ${JSON.stringify(images)};

          // Wait for editor
          const editor = await waitForElement(
            'div[placeholder="有什么想和大家分享的？"][contenteditable="true"]'
          );
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Focus and fill content
          editor.focus();
          editor.textContent = '';
          editor.textContent = ${JSON.stringify(content)};

          // Trigger input event
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: ${JSON.stringify(content)}
          });
          editor.dispatchEvent(inputEvent);

          console.log('编辑器内容已更新');

          // Fill title if provided
          const titleText = ${JSON.stringify(title)};
          if (titleText) {
            const titleInput = document.querySelector(
              'input.bili-dyn-publishing__title__input, input[maxlength="20"][placeholder="好的标题更容易获得支持，选填20字"]'
            );
            if (titleInput) {
              titleInput.focus();
              titleInput.value = titleText;
              titleInput.dispatchEvent(new Event('input', { bubbles: true }));
              titleInput.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('标题已输入:', titleText);
            }
          }

          // 处理图片上传
          if (images && images.length > 0) {
            // 显示图片上传模块
            const uploadModule = document.querySelector('div.bili-dyn-publishing__image-upload');
            if (uploadModule) {
              uploadModule.style.display = 'block';
            }

            // 清理已有图片
            await cleanUploadedImages();

            // 获取上传前的成功图片数量
            const initialSuccessCount = document.querySelectorAll('div.bili-pics-uploader__item.success').length;

            // 上传图片
            await uploadImages(images);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 等待图片上传完成
            await checkImageUploadCompletion(images.length, initialSuccessCount);
          }

          console.log('Dynamic content filled successfully');
        } catch (error) {
          console.error('Failed to fill dynamic content:', error);
        }
      })()
    `
  }

  /**
   * Video content fill script with file upload support
   * Ported from MultiPost-Extension
   */
  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const description = data.content || ''
    const tags = data.tags || []
    const video = data.video
    const cover = data.cover

    return `
      (async function() {
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) { resolve(element); return; }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) { resolve(element); observer.disconnect(); }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found: ' + selector));
            }, timeout);
          });
        }

        async function uploadVideo(videoData) {
          const fileInput = await waitForElement('input[type="file"]');

          const response = await fetch(videoData.url);
          const blob = await response.arrayBuffer();
          const extension = videoData.name.split('.').pop() || 'mp4';
          const videoFilename = '${title}.' + extension;
          const videoFile = new File([blob], videoFilename, { type: videoData.type });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(videoFile);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('视频上传事件已触发:', videoFilename);
        }

        async function waitForUploadCompletion(timeout = 600000) {
          return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
              const spans = document.querySelectorAll('span');
              const uploadCompleteElement = Array.from(spans).find(
                span => span.textContent?.includes('上传完成')
              );
              if (uploadCompleteElement) {
                clearInterval(checkInterval);
                console.log('视频上传完成');
                resolve();
              }
            }, 1000);

            setTimeout(() => {
              clearInterval(checkInterval);
              reject(new Error('视频上传超时'));
            }, timeout);
          });
        }

        async function uploadCover(coverData) {
          console.log('开始上传封面', coverData);
          await waitForElement('div.cover-main-img > div.img');
          const coverUploadButton = document.querySelector('div.cover-main-img > div.img');
          if (!coverUploadButton) {
            console.log('未找到封面上传按钮');
            return;
          }

          coverUploadButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          const tabContainer = document.querySelector('div.cover-select-header-tab');
          if (!tabContainer) return;

          const uploadTab = tabContainer.firstChild?.nextSibling;
          if (!uploadTab) return;
          uploadTab.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          const fileInput = document.querySelector(
            "div.bcc-upload-wrapper > input[type='file'][accept='image/png, image/jpeg']"
          );
          if (!fileInput) return;

          const response = await fetch(coverData.url);
          const blob = await response.blob();
          const coverFile = new File([blob], coverData.name, { type: coverData.type });

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(coverFile);
          fileInput.files = dataTransfer.files;

          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          fileInput.dispatchEvent(new Event('input', { bubbles: true }));

          console.log('封面上传操作已触发');
          await new Promise(resolve => setTimeout(resolve, 3000));

          const doneButtons = document.querySelectorAll('div.cover-select-footer-pick button');
          const doneButton = Array.from(doneButtons).find(btn => btn.textContent === ' 完成 ');
          if (doneButton) {
            doneButton.click();
            console.log('封面上传完成');
          }
        }

        try {
          const videoData = ${JSON.stringify(video)};
          const coverData = ${JSON.stringify(cover)};
          const title = ${JSON.stringify(title)};
          const description = ${JSON.stringify(description)};
          const tags = ${JSON.stringify(tags)};

          // 上传视频
          if (videoData && videoData.url) {
            await waitForElement('input[type="file"]');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await uploadVideo(videoData);
            console.log('视频上传已初始化');

            try {
              await waitForUploadCompletion();
              console.log('视频上传已完成，继续后续操作');
            } catch (error) {
              console.error('等待视频上传完成时出错:', error);
              return;
            }
          }

          // 填写标题
          const titleInput = await waitForElement('input.input-val[type="text"][maxlength="80"]');
          if (title && titleInput) {
            titleInput.focus();
            titleInput.value = title;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('标题已输入:', title);
          }

          // 填写简介
          const editor = await waitForElement('div.ql-editor[contenteditable="true"]');
          if (editor && description) {
            editor.innerHTML = description;
            console.log('简介已输入:', description);
          }

          await new Promise(resolve => setTimeout(resolve, 3000));

          // 清除已有标签
          const existingTags = document.querySelectorAll('div.tag-pre-wrp > div.label-item-v2-container');
          console.log('发现 ' + existingTags.length + ' 个已有标签，准备清除...');
          for (const tag of existingTags) {
            const closeButton = tag.querySelector('.label-item-v2-close');
            if (closeButton) {
              closeButton.click();
              await new Promise(resolve => setTimeout(resolve, 400));
            }
          }

          // 添加标签
          if (tags.length === 0) {
            console.log('未指定标签，选择热门标签...');
            const hotTags = document.querySelectorAll('.hot-tag-item');
            for (let i = 0; i < 3 && i < hotTags.length; i++) {
              hotTags[i].click();
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            console.log('添加指定标签...');
            const tagInput = document.querySelector('input[placeholder="按回车键Enter创建标签"]');
            if (tagInput) {
              for (const tag of tags.slice(0, 10)) {
                tagInput.value = tag;
                const enterEvent = new KeyboardEvent('keydown', {
                  bubbles: true,
                  cancelable: true,
                  key: 'Enter',
                  code: 'Enter',
                  keyCode: 13,
                  which: 13
                });
                tagInput.dispatchEvent(enterEvent);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }

          // 上传封面
          if (coverData && coverData.url) {
            await uploadCover(coverData);
          }

          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('B站视频内容填充完成');
        } catch (error) {
          console.error('B站视频发布过程中出错:', error);
        }
      })()
    `
  }

  /**
   * Article content fill script
   */
  private getArticleFillScript(data: ArticleData): string {
    const title = data.title || ''
    const content = data.htmlContent || data.markdownContent || ''

    return `
      (async function() {
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) { resolve(element); return; }

            const observer = new MutationObserver(() => {
              const element = document.querySelector(selector);
              if (element) { resolve(element); observer.disconnect(); }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Element not found: ' + selector));
            }, timeout);
          });
        }

        try {
          // Wait for title input
          const titleInput = await waitForElement('textarea[placeholder="请输入标题（建议30字以内）"]');
          await new Promise(resolve => setTimeout(resolve, 500));

          // Fill title
          const title = ${JSON.stringify(title)};
          if (title) {
            titleInput.focus();
            titleInput.value = title;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Fill content
          const content = ${JSON.stringify(content)};
          if (content) {
            // Try to find the article editor
            const contentEditor = document.querySelector('div.ql-editor[contenteditable="true"]') ||
                                  document.querySelector('div[contenteditable="true"].public-DraftEditor-content');
            if (contentEditor) {
              contentEditor.innerHTML = content;
              contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }

          console.log('Article content filled successfully');
        } catch (error) {
          console.error('Failed to fill article content:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: WebContentsView): Promise<boolean> {
    const cookies = await view.webContents.session.cookies.get({
      domain: '.bilibili.com'
    })
    return cookies.some((c) => c.name === 'SESSDATA')
  }

  async getUserInfo(
    view: WebContentsView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const result = await this.executeScript<{
        isLogin: boolean
        username: string
        avatar: string
        mid: string
      } | null>(
        view,
        `
        (async function() {
          try {
            const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
              method: 'GET',
              credentials: 'include'
            });
            const data = await response.json();

            if (data.data?.isLogin) {
              return {
                isLogin: true,
                username: data.data.uname,
                avatar: data.data.face,
                mid: String(data.data.mid)
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        })()
      `
      )

      if (result) {
        return {
          username: result.mid,
          displayName: result.username,
          avatar: result.avatar
        }
      }
      return null
    } catch {
      return null
    }
  }

  async navigateToPublishPage(view: WebContentsView, contentType?: SyncContentType): Promise<void> {
    const url = contentType
      ? PLATFORM_PUBLISH_URLS.bilibili[contentType] || this.publishUrl
      : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes(new URL(url).hostname)) {
      await view.webContents.loadURL(url)
      await this.waitForNavigation(view)
      await this.sleep(2000)
    }
  }

  async fillContent(
    view: WebContentsView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void> {
    await this.executeScript(view, this.getFillScript(contentType, data))
  }

  async submit(view: WebContentsView, contentType?: SyncContentType): Promise<PublishResult> {
    try {
      let script: string

      switch (contentType) {
        case 'VIDEO':
          script = `
            (async function() {
              const submitBtn = document.querySelector('span.submit-add');
              if (submitBtn) {
                submitBtn.click();
                console.log('Video submit button clicked');
                await new Promise(resolve => setTimeout(resolve, 3000));
                return { clicked: true };
              }
              return { clicked: false, error: 'Video submit button not found' };
            })()
          `
          break

        case 'ARTICLE':
          // For articles, just indicate success - user needs to manually save/publish
          script = `
            (async function() {
              // Try to find and click save draft button
              const buttons = document.querySelectorAll('button');
              for (const btn of buttons) {
                if (
                  btn.textContent?.includes('提交文章') ||
                  btn.textContent?.includes('保存') ||
                  btn.textContent?.includes('发布')
                ) {
                  btn.click();
                  console.log('Article button clicked');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  return { clicked: true };
                }
              }
              return { clicked: false, error: 'Article save/publish button not found' };
            })()
          `
          break

        case 'DYNAMIC':
        default:
          script = `
            (async function() {
              const maxAttempts = 3;
              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const publishButton = document.querySelector('div.bili-dyn-publishing__action.launcher');
                if (publishButton) {
                  publishButton.click();
                  console.log('Dynamic publish button clicked');
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  return { clicked: true };
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              return { clicked: false, error: 'Dynamic publish button not found' };
            })()
          `
          break
      }

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(view, script)

      if (!result.clicked) {
        return { success: false, error: result.error || '未找到发布按钮' }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '发布失败'
      }
    }
  }
}
