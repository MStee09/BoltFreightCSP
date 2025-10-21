
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { CalendarCheck, AlertOctagon } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { ensureArray } from "../utils";

export default function TodayTasks({ tasks }) {
  const safeTasks = ensureArray(tasks);

  const todayTasks = safeTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const overdueTasks = safeTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
          <span>Today's Tasks</span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {todayTasks.length + overdueTasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {todayTasks.length === 0 && overdueTasks.length === 0 ? (
           <div className="text-center py-12">
            <CalendarCheck className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-slate-900 font-medium mb-1">All Clear for Today!</p>
            <p className="text-sm text-slate-500">No tasks are due today.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
             {overdueTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg bg-red-50">
                <Checkbox id={`task-${task.id}`} className="mt-1" />
                <div className="flex-1">
                  <label htmlFor={`task-${task.id}`} className="font-medium text-sm text-slate-800 cursor-pointer">{task.title}</label>
                  <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
                    <AlertOctagon className="w-3 h-3" />
                    <span>Overdue: {format(new Date(task.due_date), 'MMM d')}</span>
                  </div>
                </div>
              </div>
            ))}
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-2">
                <Checkbox id={`task-${task.id}`} className="mt-1" />
                <label htmlFor={`task-${task.id}`} className="font-medium text-sm text-slate-800 cursor-pointer">{task.title}</label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
