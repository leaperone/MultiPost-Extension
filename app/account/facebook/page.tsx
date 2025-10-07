import { fetchFacebookPagesFromSession } from '@/actions/social-media-accounts/facebook-pages';
import { redirect } from 'next/navigation';
import { Fragment } from 'react';
import FacebookPagesSelector from './selector';

interface FacebookSelectablePage {
  id: string;
  name: string;
  category?: string;
  username?: string;
  tasks?: string[];
}

export default async function FacebookPagesSelectionPage() {
  const { account, pages } = await fetchFacebookPagesFromSession();

  if (!account) {
    redirect('/dashboard/settings/social-media-accounts?error=facebook_session_expired');
  }

  const selectablePages: FacebookSelectablePage[] = pages.map((page) => ({
    id: page.id,
    name: page.name,
    category: page.category,
    username: page.username,
    tasks: page.tasks,
  }));

  return (
    <Fragment>
      <FacebookPagesSelector pages={selectablePages} />
    </Fragment>
  );
}
