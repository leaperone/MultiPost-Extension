'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackSigninMethodClicked, trackEmailVerificationClicked } from '@/lib/posthog/events';

/**
 * 登录事件追踪组件
 * 监听登录表单提交事件并进行追踪
 */
export function SigninAnalytics() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleFormSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const method = form.dataset.signinMethod;

      if (method) {
        trackSigninMethodClicked(method as 'github' | 'google' | 'passkey' | 'email' | 'http-email');
      }
    };

    // 监听所有 form 的 submit 事件
    document.addEventListener('submit', handleFormSubmit);

    return () => {
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, []);

  // 追踪邮件验证链接点击
  useEffect(() => {
    // 检测 URL 中是否包含验证令牌参数（NextAuth 使用 token 参数）
    const token = searchParams.get('token');
    const callbackUrl = searchParams.get('callbackUrl');

    // 如果 URL 包含 token 参数，说明是从邮件验证链接跳转过来的
    if (token && callbackUrl) {
      trackEmailVerificationClicked('email_link');
    }
  }, [searchParams]);

  return null;
}
