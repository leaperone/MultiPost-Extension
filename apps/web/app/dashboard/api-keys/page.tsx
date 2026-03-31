import { redirect } from 'next/navigation';

export default function ApiKeysPage() {
  redirect('/dashboard/settings/api-keys');
}
