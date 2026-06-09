import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  BookOpenIcon,
  DownloadIcon,
  FolderIcon,
  LayoutDashboard,
  LayoutGridIcon,
  PaletteIcon,
  SendIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { useTranslation } from '../../i18n/client';

export function HomePageNavigationMenu() {
  const { t } = useTranslation('home');

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={cn(navigationMenuTriggerStyle(), 'group')}>
            <Link to={'/dashboard' as never}>
              <LayoutDashboard className="mr-2 size-4 transition-transform" />
              {t('navigation.dashboard')}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <MenuItem
          title={t('navigation.features')}
          icon={LayoutGridIcon}
          items={[
            {
              title: t('navigation.publish'),
              icon: SendIcon,
              href: '/dashboard/publish',
              description: t('navigation.publishDesc'),
            },
            {
              title: t('navigation.draw'),
              icon: PaletteIcon,
              href: '/dashboard/draw',
              description: t('navigation.drawDesc'),
            },
          ]}
        />
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={cn(navigationMenuTriggerStyle(), 'group')}>
            <Link to="/install">
              <DownloadIcon className="mr-2 size-4 transition-transform" />
              {t('navigation.download')}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={cn(navigationMenuTriggerStyle(), 'group')}>
            <Link to={'/docs' as never}>
              <BookOpenIcon className="mr-2 size-4 transition-transform" />
              {t('navigation.docs')}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={cn(navigationMenuTriggerStyle(), 'group')}>
            <Link to={'/blog' as never}>
              <FolderIcon className="mr-2 size-4 transition-transform" />
              {t('navigation.blog')}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function MenuItem({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: { title: string; icon: React.ElementType; href: string; description: string }[];
}) {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="group">
        <Icon className="mr-2 size-4 transition-transform" />
        {title}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
          {items.map((item) => (
            <ListItem
              key={item.title}
              {...item}
            />
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

const ListItem = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    icon: React.ElementType;
    description: string;
    href: string;
  }
>(({ className, title, description, icon: Icon, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          to={href as never}
          className={cn(
            'group block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-all duration-200 ease-in-out hover:scale-105 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className,
          )}
          {...props}>
          <div className="flex items-center space-x-2">
            <Icon className="size-5 transition-transform group-hover:scale-110" />
            <div className="text-sm font-medium leading-none transition-colors">{title}</div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-muted-foreground transition-colors">
            {description}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
