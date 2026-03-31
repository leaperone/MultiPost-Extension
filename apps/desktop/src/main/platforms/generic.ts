import type { BrowserView } from 'electron'
import type {
  PublishResult,
  SyncContentType,
  SyncContentData,
  DynamicData,
  VideoData,
  ArticleData,
  PlatformType
} from '../../shared/types'
import { BasePlatformAdapter } from './base'
import { PLATFORMS, PLATFORM_PUBLISH_URLS } from '../../shared/constants'

/**
 * Platform-specific configuration for login detection and content filling
 */
interface PlatformConfig {
  // Cookie configuration for login detection
  cookieDomain: string
  cookieName: string
  // Selectors for content filling
  titleSelector?: string
  contentSelector?: string
  // Submit button text patterns
  submitTexts?: string[]
}

/**
 * Platform configurations for all supported platforms
 */
const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  // ========== 中国动态平台 ==========
  xueqiu: {
    cookieDomain: '.xueqiu.com',
    cookieName: 'xq_a_token',
    contentSelector: 'textarea',
    submitTexts: ['发布', '发送']
  },
  okjike: {
    cookieDomain: '.okjike.com',
    cookieName: 'accessToken',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发送']
  },
  kuaishou: {
    cookieDomain: '.kuaishou.com',
    cookieName: 'passToken',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  baijiahao: {
    cookieDomain: '.baidu.com',
    cookieName: 'BDUSS',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发表']
  },
  toutiao: {
    cookieDomain: '.toutiao.com',
    cookieName: 'sso_uid_tt',
    contentSelector: 'textarea',
    submitTexts: ['发布', '发表']
  },
  toutiaohao: {
    cookieDomain: '.toutiao.com',
    cookieName: 'sso_uid_tt',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '发表']
  },
  weixinchannel: {
    cookieDomain: '.qq.com',
    cookieName: 'skey',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发表']
  },
  v2ex: {
    cookieDomain: '.v2ex.com',
    cookieName: 'A2',
    titleSelector: 'input[name="title"]',
    contentSelector: 'textarea[name="content"]',
    submitTexts: ['发布', 'Create']
  },
  douban: {
    cookieDomain: '.douban.com',
    cookieName: 'dbcl2',
    contentSelector: 'textarea',
    submitTexts: ['发布', '发送']
  },
  dedao: {
    cookieDomain: '.dedao.cn',
    cookieName: 'token',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发表']
  },
  zsxq: {
    cookieDomain: '.zsxq.com',
    cookieName: 'zsxqsessionid',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发表']
  },
  xiaoheihe: {
    cookieDomain: '.xiaoheihe.cn',
    cookieName: 'pkey',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发表']
  },
  maimai: {
    cookieDomain: '.maimai.cn',
    cookieName: 'access_token',
    contentSelector: 'textarea',
    submitTexts: ['发布', '发送']
  },
  juejin: {
    cookieDomain: '.juejin.cn',
    cookieName: 'sessionid',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发沸点']
  },
  douyin: {
    cookieDomain: '.douyin.com',
    cookieName: 'sessionid',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  zhihu: {
    cookieDomain: '.zhihu.com',
    cookieName: 'z_c0',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '发送']
  },
  wechat: {
    cookieDomain: '.qq.com',
    cookieName: 'skey',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '保存']
  },

  // ========== 国际动态平台 ==========
  instagram: {
    cookieDomain: '.instagram.com',
    cookieName: 'sessionid',
    contentSelector: 'textarea',
    submitTexts: ['Share', 'Post', '分享']
  },
  facebook: {
    cookieDomain: '.facebook.com',
    cookieName: 'c_user',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['Post', 'Share', '发布']
  },
  linkedin: {
    cookieDomain: '.linkedin.com',
    cookieName: 'li_at',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['Post', '发布']
  },
  reddit: {
    cookieDomain: '.reddit.com',
    cookieName: 'reddit_session',
    titleSelector: 'textarea[placeholder*="Title"]',
    contentSelector: 'textarea[placeholder*="Text"]',
    submitTexts: ['Post', 'Submit']
  },
  threads: {
    cookieDomain: '.threads.net',
    cookieName: 'sessionid',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['Post', '发布']
  },
  bluesky: {
    cookieDomain: '.bsky.app',
    cookieName: 'BSKYHANDLE',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['Post', '发布']
  },
  substack: {
    cookieDomain: '.substack.com',
    cookieName: 'substack.sid',
    titleSelector: 'input[placeholder*="Title"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['Publish', 'Post', '发布']
  },
  webhook: {
    cookieDomain: '.multipost.app',
    cookieName: 'session',
    contentSelector: 'textarea',
    submitTexts: ['Send', '发送']
  },

  // ========== 视频平台 ==========
  youtube: {
    cookieDomain: '.youtube.com',
    cookieName: 'SSID',
    titleSelector: 'input[placeholder*="Title"]',
    contentSelector: 'textarea',
    submitTexts: ['Publish', 'Next', '发布']
  },
  tiktok: {
    cookieDomain: '.tiktok.com',
    cookieName: 'sessionid',
    titleSelector: 'input',
    contentSelector: 'textarea',
    submitTexts: ['Post', 'Publish', '发布']
  },
  eastmoney: {
    cookieDomain: '.eastmoney.com',
    cookieName: 'utoken',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '提交']
  },
  qie: {
    cookieDomain: '.qq.com',
    cookieName: 'skey',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  chejiahao: {
    cookieDomain: '.autohome.com.cn',
    cookieName: 'autoimageuid',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  dewu: {
    cookieDomain: '.dewu.com',
    cookieName: 'duToken',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  yiche: {
    cookieDomain: '.yiche.com',
    cookieName: 'ycuid',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  sohu: {
    cookieDomain: '.sohu.com',
    cookieName: 'SUV',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  netease: {
    cookieDomain: '.163.com',
    cookieName: 'NTES_SESS',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  dayu: {
    cookieDomain: '.dayu.com',
    cookieName: '_m_h5_tk',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  alipay: {
    cookieDomain: '.alipay.com',
    cookieName: 'ALIPAYJSESSIONID',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  yidian: {
    cookieDomain: '.yidianzixun.com',
    cookieName: 'JSESSIONID',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  pinduoduo: {
    cookieDomain: '.pinduoduo.com',
    cookieName: 'PASS_ID',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },
  vivovideo: {
    cookieDomain: '.vivo.com.cn',
    cookieName: 'at',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: 'textarea',
    submitTexts: ['发布', '上传']
  },

  // ========== 文章平台 ==========
  csdn: {
    cookieDomain: '.csdn.net',
    cookieName: 'UserToken',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '保存']
  },
  jianshu: {
    cookieDomain: '.jianshu.com',
    cookieName: 'remember_user_token',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '保存']
  },
  segmentfault: {
    cookieDomain: '.segmentfault.com',
    cookieName: 'PHPSESSID',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '保存']
  },
  sspai: {
    cookieDomain: '.sspai.com',
    cookieName: 'sspai_jwt_token',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '保存']
  },
  '51cto': {
    cookieDomain: '.51cto.com',
    cookieName: 'AUTH_TOKEN',
    titleSelector: 'input[placeholder*="标题"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['发布', '保存']
  },
  wordpress: {
    cookieDomain: '.wordpress.com',
    cookieName: 'wordpress_logged_in',
    titleSelector: 'input[placeholder*="Title"]',
    contentSelector: '[contenteditable="true"]',
    submitTexts: ['Publish', 'Save', '发布']
  }
}

/**
 * Generic platform adapter that works for most platforms
 * Uses configuration-based approach for login detection and content filling
 */
export class GenericAdapter extends BasePlatformAdapter {
  readonly platform: PlatformType
  readonly name: string
  readonly publishUrl: string
  readonly supportedContentTypes: SyncContentType[]
  private readonly config: PlatformConfig

  constructor(platform: PlatformType) {
    super()
    this.platform = platform

    const platformInfo = PLATFORMS[platform]
    if (!platformInfo) {
      throw new Error(`Unknown platform: ${platform}`)
    }

    this.name = platformInfo.name
    this.publishUrl = platformInfo.url
    this.supportedContentTypes = platformInfo.supportedContentTypes

    // Get platform-specific config or use default
    this.config = PLATFORM_CONFIGS[platform] || {
      cookieDomain: new URL(platformInfo.url).hostname.replace('www.', '.'),
      cookieName: 'session',
      contentSelector: '[contenteditable="true"], textarea',
      submitTexts: ['发布', 'Publish', 'Post', '发送', 'Submit']
    }
  }

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

  private getDynamicFillScript(data: DynamicData): string {
    const content = data.content || ''
    const title = data.title || ''
    const fullContent = title ? `${title}\n${content}` : content
    const titleSelector = this.config.titleSelector || 'input[type="text"]'
    const contentSelector = this.config.contentSelector || '[contenteditable="true"], textarea'

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

        function setInputValue(element, value) {
          if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (element.contentEditable === 'true') {
            element.focus();
            // Try paste event
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer()
            });
            pasteEvent.clipboardData.setData('text/plain', value);
            element.dispatchEvent(pasteEvent);
            // Fallback: set innerHTML
            if (!element.textContent || element.textContent.length < value.length / 2) {
              element.innerHTML = value.replace(/\\n/g, '<br>');
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }

        try {
          // Try to fill title if title selector exists and we have a title
          ${
            this.config.titleSelector
              ? `
          try {
            const titleInput = await waitForElement(${JSON.stringify(titleSelector)});
            if (titleInput) {
              setInputValue(titleInput, ${JSON.stringify(title)});
            }
          } catch (e) {
            console.log('Title input not found, skipping');
          }
          `
              : ''
          }

          // Fill content
          const contentElement = await waitForElement(${JSON.stringify(contentSelector)});
          if (contentElement) {
            setInputValue(contentElement, ${this.config.titleSelector ? JSON.stringify(content) : JSON.stringify(fullContent)});
          }

          console.log('Content filled successfully for ${this.platform}');
        } catch (error) {
          console.error('Failed to fill content:', error);
        }
      })()
    `
  }

  private getVideoFillScript(data: VideoData): string {
    const title = data.title || ''
    const description = data.content || ''
    const tags = data.tags || []
    const tagsText = tags.map((t) => '#' + t).join(' ')
    const fullContent = description + (tagsText ? ' ' + tagsText : '')

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

        function setInputValue(element, value) {
          if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (element.contentEditable === 'true') {
            element.innerHTML = value.replace(/\\n/g, '<br>');
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        try {
          // Fill title
          const titleInput = await waitForElement('input[type="text"], input[placeholder*="标题"], input[placeholder*="Title"]');
          if (titleInput) {
            setInputValue(titleInput, ${JSON.stringify(title)});
          }

          // Fill description
          await new Promise(resolve => setTimeout(resolve, 500));
          const contentElement = await waitForElement('textarea, [contenteditable="true"]');
          if (contentElement) {
            setInputValue(contentElement, ${JSON.stringify(fullContent)});
          }

          console.log('Video content filled successfully for ${this.platform}');
        } catch (error) {
          console.error('Failed to fill video content:', error);
        }
      })()
    `
  }

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

        function setInputValue(element, value) {
          if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (element.contentEditable === 'true') {
            element.innerHTML = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        try {
          // Fill title
          const titleInput = await waitForElement('input[type="text"], input[placeholder*="标题"], input[placeholder*="Title"]');
          if (titleInput) {
            setInputValue(titleInput, ${JSON.stringify(title)});
          }

          // Fill content
          await new Promise(resolve => setTimeout(resolve, 500));
          const contentElement = await waitForElement('[contenteditable="true"], .editor, .ProseMirror, .CodeMirror, textarea');
          if (contentElement) {
            setInputValue(contentElement, ${JSON.stringify(content)});
          }

          console.log('Article content filled successfully for ${this.platform}');
        } catch (error) {
          console.error('Failed to fill article content:', error);
        }
      })()
    `
  }

  async checkLoginStatus(view: BrowserView): Promise<boolean> {
    try {
      const cookies = await view.webContents.session.cookies.get({
        domain: this.config.cookieDomain
      })
      return cookies.some((c) => c.name === this.config.cookieName)
    } catch {
      return false
    }
  }

  async getUserInfo(
    view: BrowserView
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      // Generic user info extraction - tries common patterns
      return await this.executeScript<{
        username: string
        displayName?: string
        avatar?: string
      } | null>(
        view,
        `
        (function() {
          try {
            // Try various common selectors for user info
            const selectors = [
              '.user-name', '.username', '.user-info', '.profile-name',
              '[class*="user"]', '[class*="profile"]', '[class*="avatar"]'
            ];

            let displayName = '';
            let avatar = '';

            for (const selector of selectors) {
              const el = document.querySelector(selector);
              if (el) {
                const text = el.textContent?.trim();
                if (text && text.length > 0 && text.length < 50) {
                  displayName = text;
                  break;
                }
              }
            }

            // Try to find avatar
            const avatarEl = document.querySelector('img[class*="avatar"], img[class*="profile"], .avatar img');
            if (avatarEl) {
              avatar = avatarEl.src || '';
            }

            if (displayName) {
              return { username: displayName, displayName, avatar };
            }

            return { username: '${this.platform}_user', displayName: '', avatar: '' };
          } catch (e) {
            return null;
          }
        })()
      `
      )
    } catch {
      return null
    }
  }

  async navigateToPublishPage(view: BrowserView, contentType?: SyncContentType): Promise<void> {
    const urls = PLATFORM_PUBLISH_URLS[this.platform]
    const url = contentType && urls?.[contentType] ? urls[contentType] : this.publishUrl

    const currentUrl = view.webContents.getURL()
    if (!currentUrl.includes(new URL(url!).hostname)) {
      await view.webContents.loadURL(url!)
      await this.waitForNavigation(view)
      await this.sleep(2000)
    }
  }

  async fillContent(
    view: BrowserView,
    contentType: SyncContentType,
    data: SyncContentData
  ): Promise<void> {
    await this.executeScript(view, this.getFillScript(contentType, data))
  }

  async submit(view: BrowserView, _contentType?: SyncContentType): Promise<PublishResult> {
    try {
      const submitTexts = this.config.submitTexts || ['发布', 'Publish', 'Post', '发送']

      const result = await this.executeScript<{ clicked: boolean; error?: string }>(
        view,
        `
        (async function() {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const submitTexts = ${JSON.stringify(submitTexts)};

          // Find button by text
          const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
          let publishButton = null;

          for (const button of buttons) {
            const text = button.textContent || button.value || '';
            if (submitTexts.some(t => text.includes(t))) {
              publishButton = button;
              break;
            }
          }

          if (publishButton) {
            // Wait for button to be enabled
            let attempts = 0;
            while ((publishButton.disabled || publishButton.getAttribute('aria-disabled') === 'true') && attempts < 30) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }

            if (publishButton.disabled || publishButton.getAttribute('aria-disabled') === 'true') {
              return { clicked: false, error: 'Button is still disabled after 30s' };
            }

            publishButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { clicked: true };
          }

          return { clicked: false, error: 'Submit button not found' };
        })()
      `
      )

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

/**
 * Factory function to create a GenericAdapter for a platform
 */
export function createGenericAdapter(platform: PlatformType): GenericAdapter {
  return new GenericAdapter(platform)
}
