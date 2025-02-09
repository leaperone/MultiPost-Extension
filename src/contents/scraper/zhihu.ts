import { ArticleData } from './default';
import { preprocessor } from './preprocessor';

export default async function scrapeZhihuContent(): Promise<ArticleData | undefined> {
  console.debug('zhihu spider ...');

  const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  
  console.debug('title ', title);
  
  const author = document.querySelector('span.AuthorInfo-name')?.textContent || '';
  const content = document.querySelector('div.RichText.ztext.Post-RichText')?.innerHTML || '';
  const digest = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

  if (!title || !content) {
    console.log('failedToGetArticleContent');
    return;
  }

  const articleData: ArticleData = {
    title: title.trim(),
    author: author.trim(),
    cover,
    content: preprocessor(content.trim()),
    digest: digest.trim()
  };

  return articleData;
} 