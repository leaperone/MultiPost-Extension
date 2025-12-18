import { posthogClient } from './posthog/server';
import crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendVerificationRequest(params: any) {
  const { identifier: to, provider, url } = params;
  const domain = provider.from.split('@').at(1);

  if (!domain) throw new Error('malformed Mailgun domain');

  const form = new FormData();
  form.append('from', `${provider.name} <${provider.from}>`);
  form.append('to', to);
  form.append('subject', `Sign in to MultiPost`);
  form.append('html', html({ url }));
  form.append('text', text({ url }));

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${provider.apiKey}`)}`,
    },
    body: form,
  });

  if (!res.ok) throw new Error('Mailgun error: ' + (await res.text()));

  // 追踪邮件验证发送事件
  // 对邮箱进行哈希处理以保护隐私
  const emailHash = crypto.createHash('sha256').update(to).digest('hex').substring(0, 8);
  if (posthogClient) {
    posthogClient.capture({
      distinctId: emailHash,
      event: 'email_verification_sent',
      properties: {
        email_hash: emailHash,
        timestamp: Date.now(),
      },
    });
  }
}

function html(params: { url: string }) {
  const { url } = params;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  </head>
  <body style='background-color:#f5f5f5;color:#333333;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";margin:0;padding:0'>
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
      Welcome back to MultiPost - Secure Sign In
      <div>
        ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
      </div>
    </div>
    <table
      align="center"
      width="100%"
      border="0"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="max-width:520px;margin:0 auto;padding:40px 20px">
      <tbody>
        <tr style="width:100%">
          <td>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0, 0, 0, 0.05);padding:40px">
              <tbody>
                <tr>
                  <td style="text-align:center;padding-bottom:32px">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="40" rx="8" fill="#346DF1"/>
                      <path d="M20 12L28 16V24L20 28L12 24V16L20 12Z" fill="white"/>
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h1 style="font-size:24px;font-weight:600;color:#111827;text-align:center;margin:0 0 12px">
                      Welcome back
                    </h1>
                    <p style="font-size:16px;line-height:24px;color:#6B7280;text-align:center;margin:0 0 24px">
                      Use the button below to securely sign in to your MultiPost account.
                    </p>
                    <table style="width:100%;margin:32px 0" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center">
                          <a
                            href="${url}"
                            style="background-color:#346DF1;border-radius:6px;color:#fff;display:inline-block;font-size:15px;font-weight:500;line-height:100%;padding:16px 24px;text-decoration:none;text-align:center;cursor:pointer;max-width:100%"
                            target="_blank">
                            Sign in to MultiPost
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size:14px;line-height:24px;color:#6B7280;text-align:center;margin:24px 0 0">
                      If you did not request this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <p style="font-size:13px;line-height:20px;color:#6B7280;text-align:center;margin:32px 0 0">
              Powered by MultiPost. Secure &amp; reliable social media management.
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
  `;
}

// Email Text body (fallback for email clients that don't render HTML, e.g. feature phones)
function text({ url }: { url: string }) {
  return `Welcome back to MultiPost

Use the link below to securely sign in to your account:
${url}

If you did not request this email, you can safely ignore it.

Powered by MultiPost - Secure & reliable social media management.
`;
}
