import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Alert } from '../api/entities';
import { supabase } from '../api/supabaseClient';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, CheckCircle, Clock, FileText, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

const EVENT_TYPES = {
  CSP: {
    label: 'CSP Events',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
    icon: FileText,
  },
  TARIFF: {
    label: 'Tariff Expirations',
    color: 'bg-green-50 text-green-700 border-green-200',
    dotColor: 'bg-green-500',
    icon: CheckCircle,
  },
  TASK: {
    label: 'Tasks & Reminders',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Clock,
  },
  MEETING: {
    label: 'Meetings & Reviews',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: Users,
  },
  ALERT: {
    label: 'Critical Alerts',
    color: 'bg-red-50 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    icon: AlertTriangle,
  },
};

const CalendarLegend = () => {
  return (
    <Card className="p-4 mb-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Event Types</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(EVENT_TYPES).map(([key, type]) => {
          const Icon = type.icon;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${type.dotColor}`} />
              <span className="text-xs text-slate-600">{type.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const CalendarHeader = ({ currentMonth, onMonthChange }) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
        {format(currentMonth, 'MMMM yyyy')}
      </h2>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onMonthChange('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onMonthChange('today')}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={() => onMonthChange('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const EventBadge = ({ event }) => {
  const type = EVENT_TYPES[event.type];
  const Icon = type.icon;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md border ${type.color} hover:shadow-sm transition-shadow cursor-pointer group`}
      title={event.description || event.title}
    >
      <div className={`w-2 h-2 rounded-full ${type.dotColor} flex-shrink-0`} />
      <span className="truncate flex-1 font-medium">{event.title}</span>
      {event.priority === 'high' && (
        <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-600" />
      )}
    </div>
  );
};

const CalendarGrid = ({ month, events }) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(new Date(event.date), day));
  };

  const getEventTypesForDay = (day) => {
    const dayEvents = getEventsForDay(day);
    const types = [...new Set(dayEvents.map(e => e.type))];
    return types;
  };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {weekdays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-slate-700 py-3 bg-slate-50 border-b border-slate-200">
            <span className="hidden lg:inline">{day}</span>
            <span className="lg:hidden">{day.slice(0, 3)}</span>
          </div>
        ))}
        {days.map((day) => {
          const eventsForDay = getEventsForDay(day);
          const eventTypes = getEventTypesForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`p-2 lg:p-3 bg-white min-h-[100px] lg:min-h-[140px] relative ${
                !isCurrentMonth ? 'bg-slate-50/50' : ''
              } ${isTodayDate ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <time
                  dateTime={format(day, 'yyyy-MM-dd')}
                  className={`text-sm font-semibold ${
                    !isCurrentMonth ? 'text-slate-400' : 'text-slate-900'
                  } ${
                    isTodayDate
                      ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                      : ''
                  }`}
                >
                  {format(day, 'd')}
                </time>
                {eventTypes.length > 0 && (
                  <div className="flex gap-1">
                    {eventTypes.map(type => (
                      <div
                        key={type}
                        className={`w-2 h-2 rounded-full ${EVENT_TYPES[type].dotColor}`}
                        title={EVENT_TYPES[type].label}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {eventsForDay.slice(0, 3).map(event => (
                  <EventBadge key={event.id} event={event} />
                ))}
                {eventsForDay.length > 3 && (
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-left px-2">
                    +{eventsForDay.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function CalendarViewPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: tariffs = [] } = useQuery({
    queryKey: ["tariffs"],
    queryFn: () => Tariff.list(),
    initialData: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => Task.list(),
    initialData: []
  });

  const { data: cspEvents = [] } = useQuery({
    queryKey: ["csp_events"],
    queryFn: () => CSPEvent.list(),
    initialData: []
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => Carrier.list(),
    initialData: []
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => Alert.list(),
    initialData: []
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["calendar_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', MOCK_USER_ID)
        .eq('status', 'pending');

      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  const allCalendarEvents = useMemo(() => {
    const events = [];

    tariffs.forEach(t => {
      if (t.expiry_date) {
        const expiryDate = new Date(t.expiry_date);
        const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

        events.push({
          id: `t-${t.id}`,
          date: t.expiry_date,
          title: `${t.carrier_name || 'Tariff'} Expires`,
          description: `Tariff ${t.version} expires`,
          type: 'TARIFF',
          priority: daysUntilExpiry <= 30 ? 'high' : 'normal',
        });
      }
    });

    tasks.forEach(t => {
      if (t.due_date) {
        events.push({
          id: `task-${t.id}`,
          date: t.due_date,
          title: t.title,
          description: t.description,
          type: 'TASK',
          priority: t.priority || 'normal',
        });
      }
    });

    cspEvents.forEach(e => {
      if (e.due_date) {
        events.push({
          id: `csp-${e.id}`,
          date: e.due_date,
          title: e.title,
          description: `${e.stage || 'CSP Event'} - ${e.title}`,
          type: 'CSP',
          priority: e.priority || 'normal',
        });
      }
      if (e.rfp_due_date) {
        events.push({
          id: `csp-rfp-${e.id}`,
          date: e.rfp_due_date,
          title: `RFP Due: ${e.title}`,
          description: `RFP submission deadline for ${e.title}`,
          type: 'CSP',
          priority: 'high',
        });
      }
    });

    carriers.forEach(c => {
      if (c.next_qbr_date) {
        events.push({
          id: `qbr-${c.id}`,
          date: c.next_qbr_date,
          title: `QBR: ${c.name}`,
          description: `Quarterly Business Review with ${c.name}`,
          type: 'MEETING',
          priority: 'normal',
        });
      }
    });

    calendarEvents.forEach(e => {
      events.push({
        id: `cal-${e.id}`,
        date: e.event_date,
        title: e.title,
        description: e.description,
        type: e.event_type === 'csp_review' ? 'MEETING' : 'TASK',
        priority: 'normal',
      });
    });

    alerts
      .filter(a => a.status === 'active' && a.due_date)
      .forEach(a => {
        events.push({
          id: `alert-${a.id}`,
          date: a.due_date,
          title: a.title,
          description: a.description,
          type: 'ALERT',
          priority: a.priority || 'high',
        });
      });

    return events;
  }, [tariffs, tasks, cspEvents, carriers, calendarEvents, alerts]);

  const handleMonthChange = (direction) => {
    if (direction === 'next') setCurrentMonth(addMonths(currentMonth, 1));
    else if (direction === 'prev') setCurrentMonth(subMonths(currentMonth, 1));
    else setCurrentMonth(new Date());
  };

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    return allCalendarEvents
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [allCalendarEvents]);

  return (
    <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            Calendar
          </h1>
          <p className="text-slate-600 mt-1">View all critical dates and events in one place</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {allCalendarEvents.length} Events
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <CalendarLegend />

          <Card className="p-4 sm:p-6">
            <CalendarHeader currentMonth={currentMonth} onMonthChange={handleMonthChange} />
            <CalendarGrid month={currentMonth} events={allCalendarEvents} />
          </Card>
        </div>

        <div className="xl:col-span-1">
          <Card className="p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events</h3>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => {
                  const type = EVENT_TYPES[event.type];
                  const Icon = type.icon;
                  const daysUntil = Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${type.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {format(new Date(event.date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          </p>
                        </div>
                        {event.priority === 'high' && (
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No upcoming events</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
