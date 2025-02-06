'use client';

import type { IconProps } from '@iconify/react';

import React from 'react';
import { Divider, Link } from '@heroui/react';
import { Icon } from '@iconify/react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useTranslation } from '@/i18n/client';
// import LanguageSwitcher from '@/components/LanguageSwitcher';

type SocialIconProps = Omit<IconProps, 'icon'>;

export default function FooterWithColumns() {
  const { t } = useTranslation('home');

  const footerNavigation = {
    services: [
      { name: 'Voite', href: 'https://voite.2some.one' },
      { name: 'MultiPost', href: 'https://multipost.app' },
      { name: '2SOMEone', href: 'https://2some.one' },
      { name: '2SOMEren', href: 'https://2some.ren' },
    ],
    legal: [
      { name: t('footer.navigation.legal.privacy'), href: '/legal/privacy' },
      { name: t('footer.navigation.legal.terms'), href: '/legal/terms' },
    ],
    social: [
      {
        name: 'GitHub',
        href: 'https://github.com/leaper-one',
        icon: (props: SocialIconProps) => (
          <Icon
            {...props}
            icon="lucide:github"
          />
        ),
      },
    ],
  };
  const renderList = React.useCallback(
    ({ title, items }: { title: string; items: { name: string; href: string }[] }) => (
      <div>
        <h3 className="text-small font-semibold text-default-600">
          {t(`footer.sections.${title.replace(/\s+/g, '').toLowerCase()}`)}
        </h3>
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.name}>
              <Link
                className="text-default-400"
                href={item.href}
                size="sm">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ),
    [t],
  );

  return (
    <footer className="flex w-full flex-col">
      <div className="px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 md:pr-8">
            <p className="text-small text-default-500">{t('footer.slogan')}</p>
            <div className="flex space-x-6">
              {footerNavigation.social.map((item) => (
                <Link
                  key={item.name}
                  isExternal
                  className="text-default-400 transition-colors hover:text-primary"
                  href={item.href}
                  title={item.name}>
                  <span className="sr-only">{item.name}</span>
                  <item.icon
                    aria-hidden="true"
                    className="size-5"
                  />
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>{renderList({ title: 'Services', items: footerNavigation.services })}</div>
              <div className="mt-10 md:mt-0">
                {/* {renderList({ title: 'Support', items: footerNavigation.supportOptions })} */}
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              {/* <div>{renderList({ title: 'About Us', items: footerNavigation.aboutUs })}</div> */}
              <div className="mt-10 md:mt-0">{renderList({ title: 'Legal', items: footerNavigation.legal })}</div>
            </div>
          </div>
        </div>
        <Divider className="mt-16 sm:mt-20 lg:mt-24" />
        <div className="flex flex-col-reverse gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-default-400 sm:text-center">{t('footer.copyright')}</p>
          <div className="flex items-center justify-end gap-3">
            <ThemeSwitcher isBlur={false} />
            {/* <div className="min-w-36">
              <LanguageSwitcher />
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  );
}
