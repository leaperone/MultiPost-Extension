import { Card, CardBody } from '@heroui/react';
import { AlertCircle } from 'lucide-react';

export function NoDataOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 max-w-lg border-warning">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center space-x-2 text-warning">
            <AlertCircle className="size-5" />
            <h3 className="text-lg font-semibold">未检测到数据</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            看起来您的网站还没有收到任何访问数据。请确保已经在您的网站中添加了跟踪代码。点击右上角的&ldquo;获取跟踪代码&rdquo;按钮来查看如何集成。
          </p>
          <p className="text-sm text-muted-foreground"> 
            如果您已经添加了跟踪代码，请等待几分钟，数据将开始显示。
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
