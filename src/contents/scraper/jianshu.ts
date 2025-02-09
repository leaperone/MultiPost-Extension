import type { ArticleData } from './default';
import { preprocessor } from './preprocessor';

export default async function scrapeJianshuContent(): Promise<ArticleData | undefined> {
  console.debug('jianshu spider ...');

  // 获取文章基本信息
  const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  const author = document.querySelector('span > a')?.textContent || '';
  const content = document.querySelector('article')?.innerHTML || '';
  const digest = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

  console.debug('title ', title);

  if (!title || !content) {
    console.log('failedToGetArticleContent');
    return;
  }

  // 处理简书文章特有的代码块标题
  const processContent = (htmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 移除代码块的标题
    const codeBlockHeaders = doc.querySelectorAll('div.code-block-extension-header');
    codeBlockHeaders.forEach((element) => element.remove());

    return preprocessor(doc.body.innerHTML);
  };

  const articleData: ArticleData = {
    title: title.trim(),
    author: author.trim(),
    cover,
    content: processContent(content.trim()),
    digest: digest.trim(),
  };

  return articleData;
}
