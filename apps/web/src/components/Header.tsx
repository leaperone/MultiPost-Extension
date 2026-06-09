import { Icon } from '@iconify/react';
import { Button, Image, Link as HeroLink, Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenu, NavbarMenuItem, NavbarMenuToggle } from '@heroui/react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { useTranslation } from '../i18n/client';
import { HomePageNavigationMenu } from './HomePage/NavigationMenu';
import LanguageSwitcher from './LanguageSwitcher';
import SignInButton from './SignInButton';
import { ThemeSwitcher } from './ThemeSwitcher';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation('home');

  return (
    <Navbar
      maxWidth="full"
      shouldHideOnScroll
      onMenuOpenChange={setIsMenuOpen}
      className="fixed inset-x-0 top-0 z-50">
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? t('navigation.closeMenu') : t('navigation.openMenu')}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link
            to={'/' as never}
            className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="MultiPost Latest Logo"
              width={32}
              height={32}
            />
            <span className="bg-gradient-to-br from-blue-300 to-pink-600 bg-clip-text font-semibold text-transparent dark:from-blue-400 dark:to-pink-400">
              MultiPost
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent
        className="hidden gap-4 sm:flex"
        justify="center">
        <HomePageNavigationMenu />
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:block">
          <ThemeSwitcher isBlur={false} />
        </NavbarItem>
        <NavbarItem className="hidden sm:block">
          <LanguageSwitcher />
        </NavbarItem>
        <NavbarMenuItem className="hidden sm:block">
          <HeroLink
            href="https://github.com/leaperone/MultiPost-Extension"
            target="_blank">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              aria-label="GitHub">
              <Icon
                icon="line-md:github-loop"
                className="size-6 text-foreground"
              />
            </Button>
          </HeroLink>
        </NavbarMenuItem>
        <NavbarItem>
          <SignInButton />
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu className="z-50">
        <MobileNavItem href="/dashboard">{t('navigation.dashboard')}</MobileNavItem>
        <MobileNavItem href="/dashboard/draw">{t('navigation.draw')}</MobileNavItem>
        <MobileNavItem href="/dashboard/publish">{t('navigation.publish')}</MobileNavItem>
        <MobileNavItem href="/install">{t('navigation.download')}</MobileNavItem>
        <NavbarMenuItem>
          <HeroLink
            href="https://github.com/leaperone/MultiPost-Extension"
            target="_blank">
            <Button
              variant="light"
              startContent={
                <Icon
                  icon="logos:github-icon"
                  className="size-5"
                />
              }>
              GitHub
            </Button>
          </HeroLink>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <LanguageSwitcher />
        </NavbarMenuItem>
        <NavbarMenuItem>
          <ThemeSwitcher isBlur={false} />
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
}

function MobileNavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <NavbarMenuItem>
      <Link
        className="w-full text-foreground"
        to={href as never}>
        {children}
      </Link>
    </NavbarMenuItem>
  );
}
