import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Task } from '../../api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, ArrowRight } from 'lucide-react';
import { isToday, isThisWeek, isPast, format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { createPageUrl } from '../../utils';

export default function MyFollowUps() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => Task.list(),
    initialData: []
  });

  const myTasks = useMemo(() => {
    if (!userProfile?.email) return { dueToday: [], dueThisWeek: [], overdue: [] };

    const userTasks = allTasks.filter(task =>
      task.status !== 'completed' &&
      (task.assigned_to === userProfile.email || task.assigned_to === userProfile.full_name)
    );

    return {
      dueToday: userTasks.filter(t => t.due_date && isToday(new Date(t.due_date))),
      dueThisWeek: userTasks.filter(t => t.due_date && !isToday(new Date(t.due_date)) && isThisWeek(new Date(t.due_date))),
      overdue: userTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)))
    };
  }, [allTasks, userProfile]);

  const totalFollowUps = myTasks.dueToday.length + myTasks.dueThisWeek.length + myTasks.overdue.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            My Follow-Ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          My Follow-Ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalFollowUps === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No upcoming follow-ups</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {myTasks.overdue.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {myTasks.overdue.length}
                    </Badge>
                    <span className="text-sm font-medium text-red-900">Overdue</span>
                  </div>
                </div>
              )}

              {myTasks.dueToday.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-amber-100 border-amber-300 text-amber-900">
                      {myTasks.dueToday.length}
                    </Badge>
                    <span className="text-sm font-medium text-amber-900">Due today</span>
                  </div>
                </div>
              )}

              {myTasks.dueThisWeek.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-blue-100 border-blue-300 text-blue-900">
                      {myTasks.dueThisWeek.length}
                    </Badge>
                    <span className="text-sm font-medium text-blue-900">Due this week</span>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(createPageUrl('Dashboard?tab=tasks'))}
            >
              View All Tasks
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
