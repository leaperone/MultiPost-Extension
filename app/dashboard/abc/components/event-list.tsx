import { multipostDb } from '@/lib/db';
import { Card, CardBody } from '@heroui/react';

interface EventListProps {
  websiteId: string;
}

export async function EventList({ websiteId }: EventListProps) {
  const events = await multipostDb.websiteEvent.findMany({
    where: {
      websiteId,
    },
    include: {
      eventData: true,
      session: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  if (!events.length) {
    return <div className="text-center text-gray-500">暂无事件数据</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id}>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {event.eventName || '页面访问'} - {event.urlPath}
                </h3>
                <div className="mt-1 space-y-1 text-sm text-gray-500">
                  <p>
                    {event.session.browser} / {event.session.os} / {event.session.device}
                  </p>
                  {event.session.country && (
                    <p>
                      {event.session.country}
                      {event.session.city && ` - ${event.session.city}`}
                    </p>
                  )}
                  <p>{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {event.eventData.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">事件数据：</h4>
                <div className="space-y-1">
                  {event.eventData.map((data) => (
                    <p
                      key={data.id}
                      className="text-sm text-gray-600">
                      {data.dataKey}:{' '}
                      {data.stringValue || data.numberValue?.toString() || data.dateValue?.toLocaleString()}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
