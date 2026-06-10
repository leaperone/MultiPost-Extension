import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getScheduledTasks, getPublishTaskDetail } from '../../../../actions/publish-task';
import { Spinner, Card } from '@heroui/react';
import TaskDetailModal from './TaskDetailModal';
import { useTranslation } from '@/i18n/client';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  description?: string;
  status: string;
  classNames: string[];
  extendedProps: {
    draftId: string;
    status: string;
    content?: string | null;
    createdAt: string;
    updatedAt: string;
    publishTaskLogs: any[];
  };
}

export default function ScheduleCalendar() {
  const { t } = useTranslation('schedule');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load all events
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const tasks = await getScheduledTasks();
      setEvents(tasks);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleEventClick = async (info: any) => {
    const taskId = info.event.id;

    try {
      setLoadingTask(true);
      const taskDetail = await getPublishTaskDetail({
        data: {
          taskId,
        },
      });
      setSelectedTask(taskDetail);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading task detail:', error);
    } finally {
      setLoadingTask(false);
    }
  };

  // Handle date click with double click detection
  const handleDateClick = (info: any) => {
    console.log('Date clicked:', info.dateStr);

    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;

      // This is a double click
      console.log('Date double clicked:', info.dateStr);

      // Get the calendar API
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        // Switch to month view
        calendarApi.changeView('dayGridMonth');

        // Navigate to the clicked date's month
        const clickedDate = new Date(info.dateStr);
        calendarApi.gotoDate(clickedDate);
      }
      return;
    }

    // Set timeout for double click detection
    clickTimeoutRef.current = setTimeout(() => {
      // Single click - do nothing for now
      console.log('Single click detected');
      clickTimeoutRef.current = null;
    }, 300);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        buttonText={{
          today: t('calendar.today'),
          month: t('calendar.month'),
          week: t('calendar.week'),
        }}
        events={events}
        editable={false}
        selectable={false}
        dayMaxEvents={true}
        weekends={true}
        height="auto"
        eventDidMount={(info) => {
          const status = info.event.extendedProps.status;

          // Add status-specific styling
          info.el.classList.add(`event-status-${status}`);

          // Add common styling
          info.el.classList.add('font-medium');
          info.el.classList.add('transition-colors');
          info.el.classList.add('duration-200');
          info.el.classList.add('cursor-pointer');

          if (info.event.extendedProps.content) {
            info.el.setAttribute('title', info.event.extendedProps.content);
          }
        }}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        navLinks={true}
        dayMaxEventRows={true}
        dayCellClassNames="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
      />

      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
      />

      {loadingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="shadow-none border flex items-center gap-3 p-6">
            <Spinner size="sm" />
            <span className="text-foreground">{t('loading.taskDetails')}</span>
          </Card>
        </div>
      )}
    </>
  );
}
