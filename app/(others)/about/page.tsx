import { Card, CardBody, CardHeader, Link } from '@heroui/react';
import { Github, Globe, Twitter } from 'lucide-react';
import { createTranslation } from '@/i18n/server';

interface FocusItem {
  title: string;
  description: string;
}

export default async function AboutPage() {
  const { t } = await createTranslation('about');

  return (
    <div className="container mx-auto h-screen overflow-y-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('description')}</p>
      </div>

      {/* LEAPERone 介绍 */}
      <div className="mb-16 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 p-8 dark:from-primary-900/10 dark:to-primary-900/20">
        <div className="mb-8">
          <h2 className="mb-4 text-3xl font-bold">{t('organization.title')}</h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">{t('organization.description')}</p>
        </div>

        <div>
          <h3 className="mb-6 text-2xl font-semibold">{t('organization.focus.title')}</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {(t('organization.focus.items', { returnObjects: true }) as FocusItem[]).map((item, index) => (
              <Card
                key={index}
                className="border-none bg-white/50 backdrop-blur dark:bg-gray-800/50">
                <CardHeader>
                  <h4 className="text-xl font-semibold">{item.title}</h4>
                </CardHeader>
                <CardBody>
                  <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* 团队成员卡片 */}
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Harry Wong */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">{t('team.harry.name')}</h3>
            <p className="text-sm text-gray-500">{t('team.harry.role')}</p>
          </CardHeader>
          <CardBody>
            <p className="mb-4 text-gray-600 dark:text-gray-400">{t('team.harry.description')}</p>
            <div className="flex items-center gap-4">
              <Link
                href="https://x.com/harry_wong_"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                <Twitter className="size-5" />
                <span>Twitter</span>
              </Link>
              <Link
                href="https://github.com/harryisfish"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                <Github className="size-5" />
                <span>GitHub</span>
              </Link>
              <Link
                href="https://bento.me/harrywong"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                <Globe className="size-5" />
                <span>Bento</span>
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* Cunoe */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">{t('team.cunoe.name')}</h3>
            <p className="text-sm text-gray-500">{t('team.cunoe.role')}</p>
          </CardHeader>
          <CardBody>
            <p className="mb-4 text-gray-600 dark:text-gray-400">{t('team.cunoe.description')}</p>
            <div className="flex items-center gap-4">
              <Link
                href="https://cunoe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                <Globe className="size-5" />
                <span>Website</span>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 社区交流 */}
      <Card className="mb-12">
        <CardHeader>
          <h2 className="text-2xl font-bold">{t('community.title')}</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t('community.qq')}：</span>
              <span>921137242</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
