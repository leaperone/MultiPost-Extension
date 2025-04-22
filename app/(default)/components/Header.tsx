'use client';

import React, { useState } from 'react';
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Link,
  Image,
} from '@heroui/react';
import { HomePageNavigationMenu } from '@/components/HomePage/NavigationMenu';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SignInButton from '@/components/SignInButton';
import { useTranslation } from '@/i18n/client';

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
          aria-label={isMenuOpen ? '关闭菜单' : '打开菜单'}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link
            href="/"
            className="flex items-center gap-2">
            <Image
              src="/favicon.ico"
              alt="MultiPost Logo"
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
        <NavbarItem className="hidden w-28 sm:block">
          <LanguageSwitcher />
        </NavbarItem>
        <NavbarItem>
          <SignInButton />
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu className="z-50">
        <NavbarMenuItem>
          <Link
            className="w-full"
            color="foreground"
            href="/dashboard"
            size="lg">
            {t('navigation.dashboard')}
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link
            className="w-full"
            color="foreground"
            href="/dashboard/publish"
            size="lg">
            {t('navigation.publish')}
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link
            className="w-full"
            color="foreground"
            href="/extension"
            size="lg">
            {t('navigation.extension')}
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Link
            className="w-full"
            color="foreground"
            href="/about"
            size="lg">
            {t('navigation.about')}
          </Link>
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
