import { redirect } from 'next/navigation';

/**
 * 发布页面默认重定向到动态发布
 */
export default function PublishPage() {
  redirect('/dashboard/desktop/publish/dynamic');
}
