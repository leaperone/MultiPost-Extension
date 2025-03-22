export async function sendVerificationRequest({
  identifier: email,
  url,
}: {
  identifier: string;
  url: string;
}) {
  console.log(`${email} plz click here to authenticate - ${url}`);
}
