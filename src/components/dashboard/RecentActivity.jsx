import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format, isPast } from "date-fns";

export default function RecentActivity({ tasks }) {
  const getTaskIcon = (status, dueDate) => {
    if (status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (dueDate && isPast(new Date(dueDate))) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-blue-500" />;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
          <span>Open Tasks</span>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {tasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {tasks.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {tasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white"
              >
                <div className="flex items-start gap-3">
                  {getTaskIcon(task.status, task.due_date)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm mb-1 truncate">
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-xs text-slate-500">
                        Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs capitalize border ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-slate-900 font-medium mb-1">All Caught Up</p>
            <p className="text-sm text-slate-500">No open tasks at this time</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}