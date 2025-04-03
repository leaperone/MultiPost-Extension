import { createTranslation } from '@/i18n/server';
import { Avatar, Button, Link } from '@heroui/react';
import { Github, Globe, Twitter } from 'lucide-react';
import { Metadata } from 'next';
import CommunityContact from './components/CommunityContact';

interface FocusItem {
  title: string;
  description: string;
}

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about our team and mission',
};

export default async function AboutPage() {
  const { t } = await createTranslation('about');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 py-20">
      {/* 页面标题 - 使用大号标题和动画下划线 */}
      <div className="container mx-auto mb-16 px-4 text-center">
        <h1 className="relative mb-6 inline-block text-5xl font-bold tracking-tight">
          {t('title')}
          <span className="absolute bottom-0 left-0 h-1 w-0 animate-[underline_3s_ease-in-out_forwards] bg-primary"></span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t('description')}</p>
      </div>

      {/* 机构介绍 - 使用现代卡片布局和悬停效果 */}
      <div className="container mx-auto mb-24 px-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl dark:from-primary/10 dark:via-primary/15 dark:to-primary/10">
          <div className="mb-12">
            <h2 className="mb-6 text-center text-3xl font-bold">{t('organization.title')}</h2>
            <p className="mx-auto max-w-3xl text-center text-lg text-muted-foreground">
              {t('organization.description')}
            </p>
          </div>

          <div>
            <h3 className="mb-8 text-center text-2xl font-semibold">{t('organization.focus.title')}</h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {(t('organization.focus.items', { returnObjects: true }) as FocusItem[]).map((item, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-xl bg-background p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute -right-20 -top-20 size-40 rounded-full bg-primary/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
                  <h4 className="mb-3 text-xl font-semibold">{item.title}</h4>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 团队成员 - 现代化的个人资料卡片 */}
      <div className="container mx-auto mb-24 px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">{t('team.title', 'Our Team')}</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Harry Wong */}
          <div className="group relative overflow-hidden rounded-xl bg-background p-1 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="absolute -z-10 size-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"></div>
            <div className="rounded-lg p-6">
              <div className="mb-6 flex flex-col items-center">
                <Avatar className="mb-4 size-24 border-4 border-background shadow-lg">
                  <img
                    src="https://github.com/harryisfish.png"
                    alt="Harry Wong"
                  />
                </Avatar>
                <h3 className="text-xl font-semibold">{t('team.harry.name')}</h3>
                <p className="text-sm text-muted-foreground">{t('team.harry.role')}</p>
              </div>
              <p className="mb-6 text-center text-muted-foreground">{t('team.harry.description')}</p>
              <div className="flex justify-center space-x-3">
                <Button
                  as={Link}
                  href="https://x.com/harryisfish"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                  size="sm"
                  className="rounded-full">
                  <Twitter className="size-5" />
                </Button>
                <Button
                  as={Link}
                  href="https://github.com/harryisfish"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                  size="sm"
                  className="rounded-full">
                  <Github className="size-5" />
                </Button>
                <Button
                  as={Link}
                  href="https://bento.me/harrywong"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                  size="sm"
                  className="rounded-full">
                  <Globe className="size-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Cunoe */}
          <div className="group relative overflow-hidden rounded-xl bg-background p-1 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="absolute -z-10 size-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"></div>
            <div className="rounded-lg p-6">
              <div className="mb-6 flex flex-col items-center">
                <Avatar className="mb-4 size-24 border-4 border-background shadow-lg">
                  <img
                    src="https://ui-avatars.com/api/?name=Cunoe&background=random"
                    alt="Cunoe"
                  />
                </Avatar>
                <h3 className="text-xl font-semibold">{t('team.cunoe.name')}</h3>
                <p className="text-sm text-muted-foreground">{t('team.cunoe.role')}</p>
              </div>
              <p className="mb-6 text-center text-muted-foreground">{t('team.cunoe.description')}</p>
              <div className="flex justify-center space-x-3">
                <Button
                  as={Link}
                  href="https://cunoe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                  size="sm"
                  className="rounded-full">
                  <Globe className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 社区交流 - 现代互动卡片 */}
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 p-8 shadow-lg backdrop-blur-sm">
          <div className="absolute -right-32 -top-32 size-64 rounded-full bg-primary/5 blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 size-64 rounded-full bg-primary/5 blur-3xl"></div>

          <h2 className="mb-8 text-center text-3xl font-bold">{t('community.title')}</h2>

          <CommunityContact
            qqGroupNumber="921137242"
            joinText={t('community.join', '加入我们')}
            copyText={t('community.copy', '复制')}
            qqLabel={t('community.qq')}
          />
        </div>
      </div>
    </div>
  );
}
