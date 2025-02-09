import type { ArticleData } from "./default";
import { preprocessor } from "./preprocessor";

export default async function scrapeWeixinContent(): Promise<ArticleData | undefined> {
    console.debug('weixin spider ...');
  
    const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const title = document.querySelector('#activity-name')?.textContent || '';
  
    console.debug('title ', title);
  
    const author =
      document.querySelector('meta[name="author"]')?.getAttribute('content') ||
      document.querySelector('#js_name')?.textContent ||
      '';
  
    const content = document.querySelector('#js_content')?.innerHTML || '';
    const digest = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  
    if (!title || !content) {
      console.log('failedToGetArticleContent');
      return;
    }
  
    // 处理微信文章特有的代码行号
    const processContent = (htmlContent: string) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
  
      // 移除代码行号
      const codeLineNumbers = doc.querySelectorAll('ul.code-snippet__line-index');
      codeLineNumbers.forEach((element) => element.remove());
  
      const processedContent = doc.body.innerHTML;
      return preprocessor(processedContent);
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
  