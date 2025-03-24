import { Button, Card, CardBody } from '@heroui/react';
import { ArrowRight, Code2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ScriptModalButton } from './ScriptModalButton';

interface FirstTimeGuideProps {
  websiteId: string;
}

export function FirstTimeGuide({ websiteId }: FirstTimeGuideProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 max-w-xl border-primary">
        <CardBody className="space-y-6 p-6">
          <div className="flex items-center space-x-2 text-primary">
            <Code2 className="size-5" />
            <h3 className="text-lg font-semibold">开始使用网站监控</h3>
          </div>

          {/* 步骤指引 */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                1
              </div>
              <ScriptModalButton websiteId={websiteId} />
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                2
              </div>
              <div className="space-y-1">
                <p className="font-medium">添加到您的网站</p>
                <p className="text-sm text-muted-foreground">
                  将跟踪代码添加到您网站的 <code>&lt;head&gt;</code> 标签中。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                3
              </div>
              <div className="space-y-1">
                <p className="font-medium">等待数据收集</p>
                <p className="text-sm text-muted-foreground">系统将自动开始收集数据，这可能需要几分钟时间。</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              as={Link}
              href={`/dashboard/webtrace/website/${websiteId}`}
              color="primary"
              startContent={<RefreshCw className="size-4" />}
              endContent={<ArrowRight className="size-4" />}>
              查看数据
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
