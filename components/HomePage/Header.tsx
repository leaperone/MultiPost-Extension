import React from 'react';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Image } from '@heroui/react';
import { HomePageNavigationMenu } from '@/components/HomePage/NavigationMenu';
import { ThemeSwitcher } from '../ThemeSwitcher';
import LanguageSwitcher from '../LanguageSwitcher';
import SignInButton from '../SignInButton';

export default function HomePageHeader() {
  return (
    <Navbar className="fixed inset-x-0 top-0 z-50">
      <NavbarBrand>
        <Link
          href="/"
          className="flex items-center gap-2">
          <Image
            src="/favicon.ico"
            alt="MultiPost"
          />
          <span className="text-xl font-semibold">MultiPost</span>
        </Link>
      </NavbarBrand>
      <NavbarContent
        className="hidden gap-4 sm:flex"
        justify="center">
        <HomePageNavigationMenu />
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem>
          <ThemeSwitcher isBlur={false} />
        </NavbarItem>
        <NavbarItem className="hidden w-28 sm:block">
          <LanguageSwitcher />
        </NavbarItem>
        <NavbarItem>
          <SignInButton />
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
