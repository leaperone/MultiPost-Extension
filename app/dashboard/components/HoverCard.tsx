import { Card, CardBody, Link } from '@heroui/react';
import { Icon } from '@iconify/react';

interface HoverCardProps {
  /** 卡片标题 */
  title: string;
  /** 标题图标 */
  titleIcon: React.ReactNode;
  /** 标题描述 */
  titleDescription?: string;
  /** 悬浮时显示的标题 */
  hoverTitle: string;
  /** 悬浮时显示的描述 */
  hoverDescription?: string;
  /** 链接地址 */
  href: string;
  /** 是否在新标签页打开链接 */
  isExternal?: boolean;
}

export const HoverCard = ({
  title,
  titleIcon,
  titleDescription,
  hoverTitle,
  hoverDescription,
  href,
  isExternal = false,
}: HoverCardProps) => {
  return (
    <Card
      as={Link}
      href={href}
      {...(isExternal && {
        target: '_blank',
        rel: 'noopener noreferrer',
      })}
      className="group relative h-32 w-full overflow-hidden">
      <CardBody className="p-0">
        {/* Main content */}
        <div className="flex flex-col space-y-2 p-6 transition-all duration-300 ease-in-out group-hover:-translate-y-full">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground/90">{title}</h3>
            {titleIcon}
          </div>
          {titleDescription && <p className="text-sm text-foreground/70 dark:text-foreground/60">{titleDescription}</p>}
        </div>

        {/* Hover content */}
        <div className="absolute left-0 top-full size-full p-6 transition-all duration-300 ease-in-out group-hover:-translate-y-full">
          <div className="h-full rounded-lg bg-primary-500/10 p-4 dark:bg-primary-500/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-primary-600 dark:text-primary-400">{hoverTitle}</h3>
              <Icon
                icon="lucide:arrow-right"
                className="size-5 text-primary-600 dark:text-primary-400"
              />
            </div>
            {hoverDescription && (
              <p className="mt-2 text-sm text-foreground/70 dark:text-foreground/60">{hoverDescription}</p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
