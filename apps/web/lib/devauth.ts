let lastVerificationUrl: string | null = null;

export function getLastVerificationUrl() {
  return lastVerificationUrl;
}

export async function sendVerificationRequest({
  identifier: email,
  url,
}: {
  identifier: string;
  url: string;
}) {
  console.log(`${email} plz click here to authenticate - ${url}`);
  lastVerificationUrl = url;
}
