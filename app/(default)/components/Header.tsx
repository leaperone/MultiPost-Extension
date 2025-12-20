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
  Button,
} from '@heroui/react';
import { HomePageNavigationMenu } from '@/components/HomePage/NavigationMenu';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SignInButton from '@/components/SignInButton';
import { useTranslation } from '@/i18n/client';
import { Icon } from '@iconify/react/dist/iconify.js';

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
            href="/"
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
          <Button
            as={Link}
            href="https://github.com/leaperone/MultiPost-Extension"
            target="_blank"
            isIconOnly
            variant="light"
            size="sm">
            <Icon
              icon="line-md:github-loop"
              className="size-6 text-foreground"
            />
          </Button>
        </NavbarMenuItem>
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
            href="/dashboard/draw"
            size="lg">
            {t('navigation.draw')}
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
          <Button
            as={Link}
            href="https://github.com/leaperone/MultiPost-Extension"
            target="_blank"
            variant="light"
            startContent={
              <Icon
                icon="logos:github-icon"
                className="size-5"
              />
            }>
            GitHub
          </Button>
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
