import type { IconProps } from '@iconify/react';

import { Icon } from '@iconify/react';
import { Button, Divider, Link as HeroLink } from '@heroui/react';
import { Link } from '@tanstack/react-router';
import React from 'react';

import { useTranslation } from '../i18n/client';
import { ThemeSwitcher } from './ThemeSwitcher';

type SocialIconProps = Omit<IconProps, 'icon'>;

export default function Footer() {
  const { t } = useTranslation('home');

  const footerNavigation = {
    services: [
      { name: 'Voite', href: 'https://voite.2some.one' },
      { name: 'MultiPost', href: 'https://multipost.app' },
      { name: '2SOMEone', href: 'https://2some.one' },
      { name: '2SOMEren', href: 'https://2some.ren' },
    ],
    support: [
      { name: t('footer.navigation.support.documentation'), href: '/docs' },
      { name: t('footer.navigation.support.status'), href: 'https://monitor.leaper.one' },
    ],
    aboutUs: [{ name: t('footer.navigation.aboutUs.team'), href: '/about' }],
    contact: [
      { name: t('footer.navigation.contact.discord'), href: 'https://discord.gg/GNsCX9zFwQ' },
      {
        name: t('footer.navigation.contact.qqGroup'),
        href: 'https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242',
      },
      { name: t('footer.navigation.contact.email'), href: 'mailto:support@leaper.one' },
    ],
    legal: [
      { name: t('footer.navigation.legal.privacy'), href: '/legal/privacy' },
      { name: t('footer.navigation.legal.terms'), href: '/legal/terms' },
    ],
    social: [
      {
        name: 'GitHub',
        href: 'https://github.com/leaperone',
        icon: (props: SocialIconProps) => (
          <Icon
            {...props}
            icon="logos:github-icon"
          />
        ),
      },
      {
        name: 'Discord',
        href: 'https://discord.gg/GNsCX9zFwQ',
        icon: (props: SocialIconProps) => (
          <Icon
            {...props}
            icon="logos:discord-icon"
          />
        ),
      },
      {
        name: 'X',
        href: 'https://x.com/harry_is_fish',
        icon: (props: SocialIconProps) => (
          <Icon
            {...props}
            icon="logos:x"
          />
        ),
      },
      {
        name: 'QQ Group',
        href: 'https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242',
        icon: (props: SocialIconProps) => (
          <Icon
            {...props}
            icon="mingcute:qq-line"
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
              <FooterLink
                href={item.href}
                className="text-small text-default-400">
                {item.name}
              </FooterLink>
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
                <HeroLink
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit our ${item.name} page`}>
                  <Button
                    size="sm"
                    isIconOnly
                    aria-label={item.name}>
                    <item.icon
                      aria-hidden="true"
                      className="size-5"
                    />
                  </Button>
                </HeroLink>
              ))}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>{renderList({ title: 'Services', items: footerNavigation.services })}</div>
              <div className="mt-10 md:mt-0">
                {renderList({ title: 'Support', items: footerNavigation.support })}
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>{renderList({ title: 'aboutUs', items: footerNavigation.aboutUs })}</div>
              <div className="mt-10 md:mt-0">
                {renderList({ title: 'Contact', items: footerNavigation.contact })}
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>{renderList({ title: 'Legal', items: footerNavigation.legal })}</div>
            </div>
          </div>
        </div>
        <Divider className="mt-16 sm:mt-20 lg:mt-24" />
        <div className="flex flex-col-reverse gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-default-400 sm:text-center">{t('footer.copyright')}</p>
          <div className="flex items-center justify-end gap-3">
            <ThemeSwitcher isBlur={false} />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (/^(https?:|mailto:)/.test(href)) {
    return (
      <HeroLink
        className={className}
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
        {children}
      </HeroLink>
    );
  }

  return (
    <Link
      className={className}
      to={href as never}>
      {children}
    </Link>
  );
}
