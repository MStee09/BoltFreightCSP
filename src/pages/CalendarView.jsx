import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Alert } from '../api/entities';
import { supabase } from '../api/supabaseClient';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Clock, FileText, Users, LayoutGrid, LayoutList, X, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { PredictiveInsightsPanel } from '../components/dashboard/PredictiveInsights';

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

const CalendarHeader = ({ currentDate, viewMode, onDateChange, onViewModeChange }) => {
  const displayText = viewMode === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`;

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800">
        {displayText}
      </h2>
      <div className="flex items-center gap-3">
        <Tabs value={viewMode} onValueChange={onViewModeChange}>
          <TabsList>
            <TabsTrigger value="month" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Month
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Week
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onDateChange('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange('today')}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => onDateChange('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const EventBadge = ({ event, onClick }) => {
  const type = EVENT_TYPES[event.type];
  const Icon = type.icon;

  return (
    <div
      onClick={() => onClick(event)}
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

const EventDetailPanel = ({ event, onClose, onUpdate }) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [notes, setNotes] = useState(event?.notes || '');

  if (!event) return null;

  const type = EVENT_TYPES[event.type];
  const Icon = type.icon;

  const generateAISummary = (event) => {
    const eventDate = new Date(event.date);
    const today = new Date();
    const daysUntil = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));

    if (event.type === 'TARIFF') {
      if (daysUntil < 0) {
        return `⚠️ ${event.entityName || 'Tariff'} has expired. Immediate renewal action required.`;
      } else if (daysUntil <= 30) {
        return `⏰ ${event.entityName || 'Tariff'} expires in ${daysUntil} days. Critical renewal window - contact carrier now.`;
      } else if (daysUntil <= 60) {
        return `📋 ${event.entityName || 'Tariff'} expires in ${daysUntil} days. Begin renewal negotiations and rate reviews.`;
      }
      return `📅 ${event.entityName || 'Tariff'} expires in ${daysUntil} days. Start planning renewal strategy.`;
    }

    if (event.type === 'CSP') {
      if (event.title.includes('RFP')) {
        return daysUntil <= 7
          ? `🚨 RFP submission deadline in ${daysUntil} days. Final review and submission preparation.`
          : `📝 RFP due in ${daysUntil} days for ${event.entityName}. Gather requirements and carrier data.`;
      }
      return `🎯 ${event.entityName} CSP milestone: ${event.title}. Owner: ${event.owner || 'Unassigned'}`;
    }

    if (event.type === 'ALERT') {
      return `⚠️ Critical alert requires immediate attention. ${event.autoGenerated ? 'Auto-escalated after 3+ days.' : 'Assigned priority action.'}`;
    }

    if (event.type === 'MEETING') {
      return `👥 ${event.title} scheduled ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}. Prepare review materials.`;
    }

    if (event.type === 'TASK') {
      return daysUntil <= 3
        ? `⏰ Task due ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}. High priority completion.`
        : `✓ Task scheduled for ${format(eventDate, 'MMM d')}. Owner: ${event.owner || 'Unassigned'}`;
    }

    return `📌 Event scheduled for ${format(eventDate, 'EEEE, MMM d, yyyy')}`;
  };

  const handleSnooze = (days) => {
    const newDate = new Date(event.date);
    newDate.setDate(newDate.getDate() + days);
    console.log(`Snoozing event ${event.id} by ${days} days to ${newDate}`);
    onClose();
  };

  const handleMarkComplete = () => {
    console.log(`Marking event ${event.id} as complete`);
    onClose();
  };

  const handleOpenEntity = () => {
    console.log(`Opening linked entity for event ${event.id}`);
  };

  const aiSummary = generateAISummary(event);

  return (
    <Sheet open={!!event} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <SheetTitle className="flex items-start gap-3">
            <div className={`p-3 rounded-lg ${type.color} flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 text-lg leading-tight">{event.title}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={type.dotColor.replace('bg-', 'bg-') + ' text-white border-0'}>
                  {type.label}
                </Badge>
                {event.priority === 'high' && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    High Priority
                  </Badge>
                )}
              </div>
            </div>
          </SheetTitle>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 leading-relaxed flex-1">{aiSummary}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Date</h4>
              <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                {format(new Date(event.date), 'MMM d, yyyy')}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {format(new Date(event.date), 'EEEE')}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Days Until</h4>
              <div className="text-2xl font-bold text-slate-900">
                {Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {new Date(event.date) < new Date() ? 'Overdue' : 'days remaining'}
              </div>
            </div>
          </div>

          <Separator />

          {event.entityName && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Linked Entity</h4>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{event.entityName}</div>
                    <div className="text-xs text-slate-600">{type.label}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleOpenEntity} className="gap-2">
                  Open
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {event.owner && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Owner / Assignee</h4>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {event.owner.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{event.owner}</div>
                    <div className="text-xs text-slate-600">Responsible</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAssigning(!isAssigning)}>
                  Reassign
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {event.description && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Description</h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                {event.description}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this event..."
              className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {event.autoGenerated && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800 flex-1">
                  <p className="font-semibold mb-1">Auto-Generated Event</p>
                  <p>{event.autoGeneratedReason}</p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleSnooze(7)}
              >
                <Clock className="w-4 h-4" />
                Snooze 7d
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleSnooze(30)}
              >
                <Clock className="w-4 h-4" />
                Snooze 30d
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={handleMarkComplete}
            >
              <CheckCircle className="w-4 h-4" />
              Mark Complete
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const CalendarGrid = ({ date, viewMode, events, onEventClick, onDateClick }) => {
  const getDateRange = () => {
    if (viewMode === 'week') {
      const startDate = startOfWeek(date);
      const endDate = endOfWeek(date);
      return { startDate, endDate, days: eachDayOfInterval({ start: startDate, end: endDate }) };
    } else {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      return { startDate, endDate, days: eachDayOfInterval({ start: startDate, end: endDate }), monthStart };
    }
  };

  const { days, monthStart } = getDateRange();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(new Date(event.date), day));
  };

  const getEventTypesForDay = (day) => {
    const dayEvents = getEventsForDay(day);
    const types = [...new Set(dayEvents.map(e => e.type))];
    return types;
  };

  if (viewMode === 'week') {
    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {weekdays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-700 py-3 bg-slate-50 border-b border-slate-200">
              {day}
            </div>
          ))}
          {days.map((day) => {
            const eventsForDay = getEventsForDay(day);
            const eventTypes = getEventTypesForDay(day);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`p-3 bg-white min-h-[400px] relative cursor-pointer hover:bg-slate-50 transition-colors ${
                  isTodayDate ? 'ring-2 ring-blue-500 ring-inset' : ''
                }`}
                onClick={(e) => {
                  if (e.target === e.currentTarget || e.target.closest('.date-header')) {
                    onDateClick && onDateClick(day);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-200 date-header">
                  <time
                    dateTime={format(day, 'yyyy-MM-dd')}
                    className={`text-base font-semibold ${
                      isTodayDate
                        ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center'
                        : 'text-slate-900'
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
                <div className="space-y-2">
                  {eventsForDay.map(event => (
                    <EventBadge key={event.id} event={event} onClick={onEventClick} />
                  ))}
                  {eventsForDay.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Click to add event</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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
          const isCurrentMonth = monthStart ? isSameMonth(day, monthStart) : true;
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`p-2 lg:p-3 bg-white min-h-[100px] lg:min-h-[140px] relative cursor-pointer hover:bg-slate-50 transition-colors ${
                !isCurrentMonth ? 'bg-slate-50/50' : ''
              } ${isTodayDate ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
              onClick={(e) => {
                if (e.target === e.currentTarget || e.target.closest('.date-header')) {
                  onDateClick && onDateClick(day);
                }
              }}
            >
              <div className="flex items-start justify-between mb-2 date-header">
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
                  <EventBadge key={event.id} event={event} onClick={onEventClick} />
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


const AIWeeklySummary = ({ events }) => {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  const thisWeekEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate >= weekStart && eventDate <= weekEnd;
  });

  const highPriorityCount = thisWeekEvents.filter(e => e.priority === 'high').length;
  const eventsByType = thisWeekEvents.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">This Week's Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/80 rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-slate-900">{thisWeekEvents.length}</div>
                <div className="text-sm text-slate-600">Total Events</div>
              </div>
              <div className="bg-white/80 rounded-lg p-4 border border-red-200">
                <div className="text-2xl font-bold text-red-600">{highPriorityCount}</div>
                <div className="text-sm text-slate-600">High Priority</div>
              </div>
              <div className="bg-white/80 rounded-lg p-4 border border-purple-200">
                <div className="text-sm text-slate-600 mb-2">Event Breakdown</div>
                <div className="space-y-1">
                  {Object.entries(eventsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${EVENT_TYPES[type].dotColor}`} />
                        {EVENT_TYPES[type].label}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function CalendarViewPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedEvent, setSelectedEvent] = useState(null);

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
    const today = new Date();

    tariffs.forEach(t => {
      if (t.expiry_date) {
        const expiryDate = new Date(t.expiry_date);
        const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

        events.push({
          id: `t-${t.id}`,
          date: t.expiry_date,
          title: `${t.carrier_name || 'Tariff'} Expires`,
          description: `Tariff ${t.version} expires`,
          type: 'TARIFF',
          priority: daysUntilExpiry <= 30 ? 'high' : 'normal',
          entityName: t.carrier_name || t.customer_name,
          owner: t.account_owner,
        });

        if (daysUntilExpiry <= 90 && daysUntilExpiry > 60) {
          const reviewDate = new Date(expiryDate);
          reviewDate.setDate(reviewDate.getDate() - 60);
          events.push({
            id: `t-review-${t.id}`,
            date: reviewDate.toISOString().split('T')[0],
            title: `Review: ${t.carrier_name || 'Tariff'}`,
            description: `Tariff review scheduled 60 days before expiration`,
            type: 'TASK',
            priority: 'normal',
            entityName: t.carrier_name || t.customer_name,
            owner: t.account_owner,
            autoGenerated: true,
            autoGeneratedReason: 'Auto-created for tariffs expiring within 90 days',
          });
        }
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
          owner: t.assigned_to,
          entityName: t.related_to,
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
          owner: e.owner,
          entityName: e.customer_name,
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
          owner: e.owner,
          entityName: e.customer_name,
          autoGenerated: true,
          autoGeneratedReason: 'Auto-synced from CSP pipeline RFP due date',
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
          entityName: c.name,
          owner: c.account_manager,
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
        owner: e.assigned_to,
      });
    });

    alerts
      .filter(a => a.status === 'active')
      .forEach(a => {
        const createdDate = new Date(a.created_date);
        const daysSinceCreated = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

        if (daysSinceCreated > 3) {
          const dueDate = a.due_date || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          events.push({
            id: `alert-${a.id}`,
            date: dueDate,
            title: a.title,
            description: a.description,
            type: 'ALERT',
            priority: 'high',
            owner: a.assigned_to,
            entityName: a.entity_type,
            autoGenerated: daysSinceCreated > 3,
            autoGeneratedReason: `Alert unresolved for ${daysSinceCreated} days - auto-added to calendar`,
          });
        } else if (a.due_date) {
          events.push({
            id: `alert-${a.id}`,
            date: a.due_date,
            title: a.title,
            description: a.description,
            type: 'ALERT',
            priority: a.priority || 'high',
            owner: a.assigned_to,
            entityName: a.entity_type,
          });
        }
      });

    return events;
  }, [tariffs, tasks, cspEvents, carriers, calendarEvents, alerts]);

  const handleDateChange = (direction) => {
    if (viewMode === 'month') {
      if (direction === 'next') setCurrentDate(addMonths(currentDate, 1));
      else if (direction === 'prev') setCurrentDate(subMonths(currentDate, 1));
      else setCurrentDate(new Date());
    } else {
      if (direction === 'next') setCurrentDate(addWeeks(currentDate, 1));
      else if (direction === 'prev') setCurrentDate(subWeeks(currentDate, 1));
      else setCurrentDate(new Date());
    }
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
            <CalendarIcon className="w-8 h-8" />
            Calendar
          </h1>
          <p className="text-slate-600 mt-1">View all critical dates and events in one place</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {allCalendarEvents.length} Events
        </Badge>
      </div>

      <AIWeeklySummary events={allCalendarEvents} />

      <PredictiveInsightsPanel
        events={allCalendarEvents}
        tariffs={tariffs}
        cspEvents={cspEvents}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <CalendarLegend />

          <Card className="p-4 sm:p-6">
            <CalendarHeader
              currentDate={currentDate}
              viewMode={viewMode}
              onDateChange={handleDateChange}
              onViewModeChange={setViewMode}
            />
            <CalendarGrid
              date={currentDate}
              viewMode={viewMode}
              events={allCalendarEvents}
              onEventClick={setSelectedEvent}
              onDateClick={(date) => {
                console.log('Date clicked:', format(date, 'yyyy-MM-dd'));
              }}
            />
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

      <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
