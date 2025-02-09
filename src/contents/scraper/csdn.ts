import type { ArticleData } from './default';
import { preprocessor } from './preprocessor';

export default async function scrapeCSDNContent(): Promise<ArticleData | undefined> {
  console.debug('CSDN spider ...');

  const preprocess = (content: string) => preprocessor(content);

  // 获取文章标题
  const title = document.querySelector('h1.title-article')?.textContent || '';
  
  // 获取作者信息
  const author = document.querySelector('a.follow-nickName')?.textContent || '';
  
  // 获取封面图
  const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  
  // 获取文章内容
  const content = document.querySelector('div#content_views')?.innerHTML || '';
  
  // 获取文章摘要
  const digest = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

  if (!title || !content) {
    console.log('failedToGetArticleContent');
    return;
  }

  const articleData: ArticleData = {
    title: title.trim(),
    author: author.trim(),
    cover,
    content: preprocess(content.trim()),
    digest: digest.trim()
  };

  return articleData;
} 