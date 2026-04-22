interface SendSupportReplyEmailParams {
  to: string;
  username?: string;
  subject: string;
  replyPreview: string;
  conversationId: string;
}

export async function sendSupportReplyEmail(params: SendSupportReplyEmailParams) {
  const { to, username, subject, replyPreview, conversationId } = params;

  const apiKey = process.env.AUTH_MAILGUN_KEY;
  const from = process.env.AUTH_MAILGUN_FROM;
  if (!apiKey || !from) {
    console.warn('Mailgun not configured, skipping support reply email');
    return;
  }

  const domain = from.split('@').at(1);
  if (!domain) throw new Error('Malformed Mailgun domain');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multipost.app';
  const viewUrl = `${siteUrl}/dashboard?support=${conversationId}`;
  const displayName = username || to.split('@')[0];

  const form = new FormData();
  form.append('from', `MultiPost Support <${from}>`);
  form.append('to', to);
  form.append('subject', `Your ticket "${subject}" has a new reply`);
  form.append(
    'html',
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="background-color:#f5f5f5;color:#333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;padding:40px 20px">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.05);padding:40px">
        <tr><td>
          <h1 style="font-size:20px;font-weight:600;color:#111;margin:0 0 16px">Support Reply</h1>
          <p style="font-size:14px;color:#666;margin:0 0 8px">Hi ${displayName},</p>
          <p style="font-size:14px;color:#666;margin:0 0 24px">Your ticket "<strong>${subject}</strong>" has a new reply:</p>
          <div style="background:#f9f9f9;border-left:3px solid #333;padding:12px 16px;border-radius:4px;margin:0 0 24px">
            <p style="font-size:14px;color:#444;margin:0;white-space:pre-wrap">${replyPreview}${replyPreview.length >= 200 ? '...' : ''}</p>
          </div>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td style="border-radius:6px;background:#111">
              <a href="${viewUrl}" style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-size:14px;font-weight:500">View Full Reply</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#999;text-align:center;margin:24px 0 0">Powered by MultiPost</p>
    </td></tr>
  </table>
</body>
</html>`,
  );
  form.append(
    'text',
    `Hi ${displayName},\n\nYour ticket "${subject}" has a new reply:\n\n${replyPreview}\n\nView full reply: ${viewUrl}\n\nPowered by MultiPost`,
  );

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Mailgun error: ${await res.text()}`);
  }
}
