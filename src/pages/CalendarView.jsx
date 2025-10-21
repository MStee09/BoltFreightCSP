
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';

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

const CalendarGrid = ({ month, events }) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(new Date(event.date), day));
  };

  return (
    <div className="grid grid-cols-7 gap-px mt-4 bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
      {weekdays.map(day => (
        <div key={day} className="text-center text-xs font-semibold text-slate-600 py-2 bg-slate-50">
          {day}
        </div>
      ))}
      {days.map((day) => {
        const eventsForDay = getEventsForDay(day);
        return (
          <div
            key={day.toString()}
            className={`p-2 bg-white min-h-[120px] ${!isSameMonth(day, monthStart) ? 'bg-slate-50 text-slate-400' : ''}`}
          >
            <time dateTime={format(day, 'yyyy-MM-dd')} className={`text-sm font-medium ${isToday(day) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
              {format(day, 'd')}
            </time>
            <div className="mt-1 space-y-1">
              {eventsForDay.map(event => (
                <div key={event.id} className={`flex items-center text-xs p-1 rounded-md ${event.color}`}>
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${event.dotColor}`} />
                  <span className="truncate">{event.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function CalendarViewPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: tariffs = [] } = useQuery({ queryKey: ["tariffs"], queryFn: () => Tariff.list(), initialData: [] });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => Task.list(), initialData: [] });
  const { data: cspEvents = [] } = useQuery({ queryKey: ["csp_events"], queryFn: () => CSPEvent.list(), initialData: [] });
  const { data: carriers = [] } = useQuery({ queryKey: ["carriers"], queryFn: () => Carrier.list(), initialData: [] });

  const calendarEvents = useMemo(() => {
    const events = [];
    
    tariffs.forEach(t => t.expiry_date && events.push({ id: `t-${t.id}`, date: t.expiry_date, title: `Expiry: ${t.version}`, color: 'bg-red-50 text-red-700', dotColor: 'bg-red-500' }));
    tasks.forEach(t => t.due_date && events.push({ id: `task-${t.id}`, date: t.due_date, title: t.title, color: 'bg-blue-50 text-blue-700', dotColor: 'bg-blue-500' }));
    cspEvents.forEach(e => e.due_date && events.push({ id: `csp-${e.id}`, date: e.due_date, title: e.title, color: 'bg-amber-50 text-amber-700', dotColor: 'bg-amber-500' }));
    carriers.forEach(c => c.next_qbr_date && events.push({ id: `qbr-${c.id}`, date: c.next_qbr_date, title: `QBR: ${c.name}`, color: 'bg-green-50 text-green-700', dotColor: 'bg-green-500' }));
    
    return events;
  }, [tariffs, tasks, cspEvents, carriers]);

  const handleMonthChange = (direction) => {
    if (direction === 'next') setCurrentMonth(addMonths(currentMonth, 1));
    else if (direction === 'prev') setCurrentMonth(subMonths(currentMonth, 1));
    else setCurrentMonth(new Date());
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-600 mt-1">View all critical dates and events in one place.</p>
        </div>
      </div>
      <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border-t border-slate-100">
        <CalendarHeader currentMonth={currentMonth} onMonthChange={handleMonthChange} />
        <CalendarGrid month={currentMonth} events={calendarEvents} />
      </div>
    </div>
  );
}
